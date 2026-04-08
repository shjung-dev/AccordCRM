package com.example.user_service.service;

import com.example.user_service.model.User;
import com.example.user_service.repository.UserRepository;
import com.example.user_service.repository.AuditLogRepository;
import com.example.user_service.dto.UserCreateRequest;
import com.example.user_service.dto.UserUpdateRequest;
import com.example.user_service.dto.AuditLogResponse;
import com.example.user_service.security.AuthPrincipal;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class UserService {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final CognitoService cognitoService;
    private final SqsLogPublisher sqsLogPublisher;

    private static final int TARGET_MIN_CLIENTS = 20;

    private static final int TARGET_MAX_CLIENTS = 40;

    private final ClientServiceClient clientServiceClient;

    public UserService(UserRepository userRepository,
            AuditLogRepository auditLogRepository,
            ClientServiceClient clientServiceClient,
            CognitoService cognitoService,
            SqsLogPublisher sqsLogPublisher) {
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.clientServiceClient = clientServiceClient;
        this.cognitoService = cognitoService;
        this.sqsLogPublisher = sqsLogPublisher;
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getVisibleAuditLogs(AuthPrincipal principal) {
        List<AuditLogResponse> logs;
        if (principal.isRootAdmin()) {
            logs = auditLogRepository.findAllLogs();
        } else if (principal.isAdmin()) {
            Set<String> agentIds = userRepository.findAllByIsAdminFalse().stream()
                    .map(User::getUserId)
                    .filter(Objects::nonNull)
                    .map(UUID::toString)
                    .collect(Collectors.toSet());
            if (principal.getUserId() != null) {
                // Admin can view all agent logs plus their own logs.
                agentIds.add(principal.getUserId().toString());
            }
            logs = auditLogRepository.findLogsByUserIds(agentIds);
        } else if (principal.isAgent()) {
            if (principal.getUserId() == null) {
                return List.of();
            }
            logs = auditLogRepository.findLogsByUserId(principal.getUserId().toString());
        } else {
            return List.of();
        }

        List<AuditLogResponse> sorted = new ArrayList<>(logs);
        sorted.sort(Comparator.comparing(
                AuditLogResponse::timestamp,
                Comparator.nullsLast(String::compareTo)
        ).reversed());

        return sorted;
    }

    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAllByDeletedAtIsNull();
    }

    @Transactional(readOnly = true)
    public List<User> getAllUsers(Pageable pageable) {
        return userRepository.findAllByDeletedAtIsNull(pageable).getContent();
    }

    @Transactional(readOnly = true)
    public List<User> getAllAgents(Pageable pageable) {
        return userRepository.findAllByIsAdminFalseAndDeletedAtIsNull(pageable).getContent();
    }

    @Transactional(readOnly = true)
    public User findById(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + userId));
        if (user.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + userId);
        }
        return user;
    }

    @Transactional(readOnly = true)
    public User findByEmail(String email) {
        return userRepository.findByEmailAddressAndDeletedAtIsNull(email)
                .orElse(null);
    }

    @Transactional
    public User findByCognitoSub(String sub) {
        User user = userRepository.findByCognitoSubAndDeletedAtIsNull(sub).orElse(null);
        if (user != null) return user;

        // Lazy backfill: user exists in Cognito but cognitoSub was never saved to DB
        String email = cognitoService.getEmailBySub(sub);
        if (email == null) return null;

        user = userRepository.findByEmailAddressAndDeletedAtIsNull(email).orElse(null);
        if (user == null) return null;

        log.info("Backfilling cognitoSub for user {} (sub={})", email, sub);
        user.setCognitoSub(sub);
        return userRepository.save(user);
    }

    @Transactional
    public User createUser(UserCreateRequest request, UUID actorId) {

        // Check if email already exists
        if (userRepository.findByEmailAddress(request.getEmailAddress()).isPresent()) {
            throw new IllegalArgumentException("User with email " + request.getEmailAddress() + " already exists");
        }

        User user = new User();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmailAddress(request.getEmailAddress());
        user.setIsAdmin(request.getIsAdmin());
        user.setIsRootAdmin(false); // Root admin can only be set manually in database
        user.setCreatedAt(Instant.now());

        User savedUser = userRepository.save(user);

        // Create corresponding Cognito user and store their sub for JWT auth
        String cognitoSub = cognitoService.createUser(
                savedUser.getEmailAddress(),
                savedUser.getFirstName(),
                savedUser.getLastName(),
                Boolean.TRUE.equals(savedUser.getIsAdmin()),
                Boolean.TRUE.equals(savedUser.getIsRootAdmin()),
                savedUser.getUserId());
        if (cognitoSub != null) {
            log.info("Cognito user created for {} (sub={})", savedUser.getEmailAddress(), cognitoSub);
            savedUser.setCognitoSub(cognitoSub);
            savedUser = userRepository.save(savedUser);
        } else {
            log.warn("Cognito user was NOT created for {} — cognitoSub is null. Check COGNITO_USER_POOL_ID env var and AWS credentials.", savedUser.getEmailAddress());
        }
        String creationReason = "Created user with: " + savedUser.getFirstName() + " " + savedUser.getLastName() + " (" + savedUser.getEmailAddress() + ")";
        sqsLogPublisher.publish(actorId, "USER_CREATED", "USER", savedUser.getUserId(), creationReason);
        return savedUser;
    }

    @Transactional
    public User updateUser(UUID userId, UserUpdateRequest request, UUID actorId) {
        User user = findById(userId);

        // Prevent changing root admin
        if (Boolean.TRUE.equals(user.getIsRootAdmin())) {
            throw new IllegalArgumentException("Cannot modify root admin user");
        }

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getEmailAddress() != null) {
            // Check if new email already exists for another user
            userRepository.findByEmailAddress(request.getEmailAddress())
                    .ifPresent(existingUser -> {
                        if (!existingUser.getUserId().equals(userId)) {
                            throw new IllegalArgumentException("Email already in use by another user");
                        }
                    });
            user.setEmailAddress(request.getEmailAddress());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }

        // Reject attempts to change admin status
        if (request.getIsAdmin() != null) {
            throw new IllegalArgumentException("Admin status cannot be modified after user creation");
        }

        User updatedUser = userRepository.save(user);
        String updateReason = "Updated user with: " + updatedUser.getFirstName() + " " + updatedUser.getLastName() + " (" + updatedUser.getEmailAddress() + ")";
        sqsLogPublisher.publish(actorId, "USER_UPDATED", "USER", updatedUser.getUserId(), updateReason);
        return updatedUser;
    }

    @Transactional
    public void deleteUser(UUID userId, String authToken, UUID actorId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cannot delete: User not found"));

        if (Boolean.TRUE.equals(user.getIsRootAdmin())) {
            throw new IllegalArgumentException("Cannot delete root admin user");
        }
        if (user.getDeletedAt() != null) {
            return;
        }

        // Only agents own clients; skip reassignment for admins
        if (Boolean.FALSE.equals(user.getIsAdmin())) {
            reassignClientsFromDeletedAgent(userId, authToken);
        }

        user.setDeletedAt(Instant.now());
        userRepository.save(user);

        // Remove from Cognito only after the DB transaction commits — prevents the user
        // being left in the DB without a Cognito account if the commit fails.
        final String emailToDelete = user.getEmailAddress();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                cognitoService.deleteUser(emailToDelete);
            }
        });

        String deleteReason = "Deleted user with: " + user.getFirstName() + " " + user.getLastName() + " (" + user.getEmailAddress() + ")";
        sqsLogPublisher.publish(actorId, "USER_DELETED", "USER", userId, deleteReason);
    }

    private void reassignClientsFromDeletedAgent(UUID deletedAgentId, String authToken) {
        List<UUID> clientIds = clientServiceClient.getActiveClientIdsByAgentId(deletedAgentId, authToken);

        if (clientIds.isEmpty())
            return;

        List<User> remainingAgents = userRepository.findAllByDeletedAtIsNull()
                .stream()
                .filter(u -> Boolean.FALSE.equals(u.getIsAdmin()))
                .filter(u -> !u.getUserId().equals(deletedAgentId))
                .collect(Collectors.toList());

        if (remainingAgents.isEmpty()) {
            throw new IllegalArgumentException(
                    "Cannot delete agent " + deletedAgentId + ": no other active agents exist to "
                            + "receive their " + clientIds.size() + " client(s). "
                            + "Please create or restore another agent first.");
        }

        Map<UUID, Integer> loadMap = new LinkedHashMap<>();
        for (User agent : remainingAgents) {
            List<UUID> agentClientIds = clientServiceClient.getActiveClientIdsByAgentId(agent.getUserId(), authToken);
            loadMap.put(agent.getUserId(), agentClientIds.size());
        }

        PriorityQueue<AgentLoad> minHeap = buildMinHeap(loadMap);
        Map<UUID, List<UUID>> assignments = distributeClients(clientIds, minHeap);
        applyAssignments(assignments, authToken);
    }

    private PriorityQueue<AgentLoad> buildMinHeap(Map<UUID, Integer> loadMap) {
        PriorityQueue<AgentLoad> heap = new PriorityQueue<>(
                Comparator.comparingInt(al -> al.clientCount));
        loadMap.forEach((agentId, count) -> heap.offer(new AgentLoad(agentId, count)));
        return heap;
    }

    private Map<UUID, List<UUID>> distributeClients(List<UUID> clientIds,
            PriorityQueue<AgentLoad> heap) {
        Map<UUID, List<UUID>> assignments = new LinkedHashMap<>();

        for (UUID clientId : clientIds) {
            AgentLoad least = heap.poll();
            if (least == null) {
                throw new RuntimeException(
                        "Heap exhausted unexpectedly while distributing client: " + clientId);
            }
            assignments.computeIfAbsent(least.agentId, k -> new ArrayList<>()).add(clientId);
            least.clientCount++;
            heap.offer(least);
        }

        return assignments;
    }

    private void applyAssignments(Map<UUID, List<UUID>> assignments, String authToken) {
        assignments.forEach((agentId, clients) -> {
            for (UUID clientId : clients) {
                clientServiceClient.reassignClient(clientId, agentId, authToken);
            }
        });
    }

    private static class AgentLoad {
        final UUID agentId;
        int clientCount;

        AgentLoad(UUID agentId, int clientCount) {
            this.agentId = agentId;
            this.clientCount = clientCount;
        }
    }

    public boolean reassignAllAgents(String deletedAgentId) {
        try {
            return true;
        } catch (Exception e) {
            log.error("Failed to reassign agents for deletedAgentId={}", deletedAgentId, e);
            return false;
        }
    }

}
