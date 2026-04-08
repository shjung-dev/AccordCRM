package com.example.user_service.service;

import com.example.user_service.dto.AuditLogResponse;
import com.example.user_service.dto.UserCreateRequest;
import com.example.user_service.dto.UserUpdateRequest;
import com.example.user_service.model.User;
import com.example.user_service.repository.AuditLogRepository;
import com.example.user_service.repository.UserRepository;
import com.example.user_service.security.AuthPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private CognitoService cognitoService;
    @Mock private SqsLogPublisher sqsLogPublisher;
    @Mock private ClientServiceClient clientServiceClient;

    @InjectMocks private UserService userService;

    // ─── helpers ────────────────────────────────────────────────────────────

    private User buildUser(UUID id, String email, boolean isAdmin, boolean isRootAdmin) {
        User u = new User();
        u.setUserId(id);
        u.setFirstName("First");
        u.setLastName("Last");
        u.setEmailAddress(email);
        u.setIsAdmin(isAdmin);
        u.setIsRootAdmin(isRootAdmin);
        u.setCreatedAt(Instant.now());
        return u;
    }

    // ─── getAllUsers ─────────────────────────────────────────────────────────

    @Test
    void getAllUsers_returnsNonDeletedUsers() {
        List<User> users = List.of(buildUser(UUID.randomUUID(), "a@test.com", false, false));
        when(userRepository.findAllByDeletedAtIsNull()).thenReturn(users);

        assertThat(userService.getAllUsers()).isEqualTo(users);
    }

    @Test
    void getAllUsers_withPageable_returnsPageContent() {
        User user = buildUser(UUID.randomUUID(), "a@test.com", false, false);
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> page = new PageImpl<>(List.of(user));
        when(userRepository.findAllByDeletedAtIsNull(pageable)).thenReturn(page);

        assertThat(userService.getAllUsers(pageable)).containsExactly(user);
    }

    // ─── getAllAgents ────────────────────────────────────────────────────────

    @Test
    void getAllAgents_returnsPaginatedNonAdminUsers() {
        User agent = buildUser(UUID.randomUUID(), "agent@test.com", false, false);
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> page = new PageImpl<>(List.of(agent));
        when(userRepository.findAllByIsAdminFalseAndDeletedAtIsNull(pageable)).thenReturn(page);

        assertThat(userService.getAllAgents(pageable)).containsExactly(agent);
    }

    // ─── findById ───────────────────────────────────────────────────────────

    @Test
    void findById_existingUser_returnsUser() {
        UUID id = UUID.randomUUID();
        User user = buildUser(id, "a@test.com", false, false);
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        assertThat(userService.findById(id)).isEqualTo(user);
    }

    @Test
    void findById_deletedUser_throwsNotFound() {
        UUID id = UUID.randomUUID();
        User user = buildUser(id, "a@test.com", false, false);
        user.setDeletedAt(Instant.now());
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.findById(id))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    void findById_nonExistentUser_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findById(id))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    // ─── findByEmail ─────────────────────────────────────────────────────────

    @Test
    void findByEmail_existingUser_returnsUser() {
        User user = buildUser(UUID.randomUUID(), "a@test.com", false, false);
        when(userRepository.findByEmailAddressAndDeletedAtIsNull("a@test.com"))
                .thenReturn(Optional.of(user));

        assertThat(userService.findByEmail("a@test.com")).isEqualTo(user);
    }

    @Test
    void findByEmail_nonExistentUser_returnsNull() {
        when(userRepository.findByEmailAddressAndDeletedAtIsNull("no@test.com"))
                .thenReturn(Optional.empty());

        assertThat(userService.findByEmail("no@test.com")).isNull();
    }

    // ─── findByCognitoSub ────────────────────────────────────────────────────

    @Test
    void findByCognitoSub_foundBySub_returnsUser() {
        User user = buildUser(UUID.randomUUID(), "a@test.com", false, false);
        when(userRepository.findByCognitoSubAndDeletedAtIsNull("sub123"))
                .thenReturn(Optional.of(user));

        assertThat(userService.findByCognitoSub("sub123")).isEqualTo(user);
    }

    @Test
    void findByCognitoSub_backfillPath_savesSubAndReturnsUser() {
        UUID id = UUID.randomUUID();
        User user = buildUser(id, "a@test.com", false, false);

        when(userRepository.findByCognitoSubAndDeletedAtIsNull("sub123")).thenReturn(Optional.empty());
        when(cognitoService.getEmailBySub("sub123")).thenReturn("a@test.com");
        when(userRepository.findByEmailAddressAndDeletedAtIsNull("a@test.com"))
                .thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        User result = userService.findByCognitoSub("sub123");

        assertThat(result).isEqualTo(user);
        assertThat(user.getCognitoSub()).isEqualTo("sub123");
        verify(userRepository).save(user);
    }

    @Test
    void findByCognitoSub_cognitoEmailNotFound_returnsNull() {
        when(userRepository.findByCognitoSubAndDeletedAtIsNull("sub123")).thenReturn(Optional.empty());
        when(cognitoService.getEmailBySub("sub123")).thenReturn(null);

        assertThat(userService.findByCognitoSub("sub123")).isNull();
    }

    @Test
    void findByCognitoSub_userNotFoundByEmail_returnsNull() {
        when(userRepository.findByCognitoSubAndDeletedAtIsNull("sub123")).thenReturn(Optional.empty());
        when(cognitoService.getEmailBySub("sub123")).thenReturn("a@test.com");
        when(userRepository.findByEmailAddressAndDeletedAtIsNull("a@test.com"))
                .thenReturn(Optional.empty());

        assertThat(userService.findByCognitoSub("sub123")).isNull();
    }

    // ─── createUser ──────────────────────────────────────────────────────────

    @Test
    void createUser_newEmail_savesUserAndPublishesLog() {
        UUID actorId = UUID.randomUUID();
        UserCreateRequest req = new UserCreateRequest();
        req.setFirstName("John");
        req.setLastName("Doe");
        req.setEmailAddress("john@test.com");
        req.setIsAdmin(false);

        when(userRepository.findByEmailAddress("john@test.com")).thenReturn(Optional.empty());

        User saved = buildUser(UUID.randomUUID(), "john@test.com", false, false);
        saved.setFirstName("John");
        saved.setLastName("Doe");
        when(userRepository.save(any(User.class))).thenReturn(saved);
        when(cognitoService.createUser(any(), any(), any(), anyBoolean(), anyBoolean(), any()))
                .thenReturn("cog-sub-001");

        User result = userService.createUser(req, actorId);

        assertThat(result).isEqualTo(saved);
        verify(sqsLogPublisher).publish(eq(actorId), eq("USER_CREATED"), eq("USER"),
                any(UUID.class), anyString());
    }

    @Test
    void createUser_duplicateEmail_throwsIllegalArgument() {
        UserCreateRequest req = new UserCreateRequest();
        req.setEmailAddress("dup@test.com");
        req.setFirstName("A");
        req.setLastName("B");
        req.setIsAdmin(false);

        when(userRepository.findByEmailAddress("dup@test.com"))
                .thenReturn(Optional.of(buildUser(UUID.randomUUID(), "dup@test.com", false, false)));

        assertThatThrownBy(() -> userService.createUser(req, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void createUser_cognitoReturnsNull_savesWithoutCognitoSub() {
        UUID actorId = UUID.randomUUID();
        UserCreateRequest req = new UserCreateRequest();
        req.setFirstName("Jane");
        req.setLastName("Doe");
        req.setEmailAddress("jane@test.com");
        req.setIsAdmin(false);

        when(userRepository.findByEmailAddress("jane@test.com")).thenReturn(Optional.empty());
        User saved = buildUser(UUID.randomUUID(), "jane@test.com", false, false);
        when(userRepository.save(any(User.class))).thenReturn(saved);
        when(cognitoService.createUser(any(), any(), any(), anyBoolean(), anyBoolean(), any()))
                .thenReturn(null);

        User result = userService.createUser(req, actorId);

        assertThat(result).isEqualTo(saved);
        // Only one save — no second save for cognitoSub when Cognito is disabled
        verify(userRepository, times(1)).save(any(User.class));
    }

    // ─── updateUser ──────────────────────────────────────────────────────────

    @Test
    void updateUser_validRequest_updatesFieldsAndPublishesLog() {
        UUID userId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        User user = buildUser(userId, "old@test.com", false, false);

        UserUpdateRequest req = new UserUpdateRequest();
        req.setFirstName("Updated");
        req.setLastName("Name");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        User result = userService.updateUser(userId, req, actorId);

        assertThat(result.getFirstName()).isEqualTo("Updated");
        assertThat(result.getLastName()).isEqualTo("Name");
        verify(sqsLogPublisher).publish(eq(actorId), eq("USER_UPDATED"), eq("USER"),
                eq(userId), anyString());
    }

    @Test
    void updateUser_rootAdminTarget_throwsIllegalArgument() {
        UUID userId = UUID.randomUUID();
        User rootAdmin = buildUser(userId, "root@test.com", true, true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(rootAdmin));

        assertThatThrownBy(() -> userService.updateUser(userId, new UserUpdateRequest(), UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("root admin");
    }

    @Test
    void updateUser_isAdminInRequest_throwsIllegalArgument() {
        UUID userId = UUID.randomUUID();
        User user = buildUser(userId, "a@test.com", false, false);
        UserUpdateRequest req = new UserUpdateRequest();
        req.setIsAdmin(true);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.updateUser(userId, req, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Admin status cannot be modified");
    }

    @Test
    void updateUser_emailInUseByAnotherUser_throwsIllegalArgument() {
        UUID userId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        User user = buildUser(userId, "a@test.com", false, false);
        User other = buildUser(otherId, "b@test.com", false, false);

        UserUpdateRequest req = new UserUpdateRequest();
        req.setEmailAddress("b@test.com");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.findByEmailAddress("b@test.com")).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> userService.updateUser(userId, req, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email already in use");
    }

    @Test
    void updateUser_emailInUseBySameUser_succeeds() {
        UUID userId = UUID.randomUUID();
        User user = buildUser(userId, "a@test.com", false, false);

        UserUpdateRequest req = new UserUpdateRequest();
        req.setEmailAddress("a@test.com");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.findByEmailAddress("a@test.com")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        assertThatNoException().isThrownBy(
                () -> userService.updateUser(userId, req, UUID.randomUUID()));
    }

    // ─── deleteUser ──────────────────────────────────────────────────────────

    @Test
    void deleteUser_adminUser_softDeletesWithoutClientReassignment() {
        UUID userId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        User user = buildUser(userId, "admin@test.com", true, false);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        try (MockedStatic<TransactionSynchronizationManager> tsm =
                     mockStatic(TransactionSynchronizationManager.class)) {
            userService.deleteUser(userId, "Bearer token", actorId);
        }

        verify(clientServiceClient, never()).getActiveClientIdsByAgentId(any(), any());
        assertThat(user.getDeletedAt()).isNotNull();
        verify(sqsLogPublisher).publish(eq(actorId), eq("USER_DELETED"), eq("USER"),
                eq(userId), anyString());
    }

    @Test
    void deleteUser_agentWithNoClients_softDeletes() {
        UUID userId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        User user = buildUser(userId, "agent@test.com", false, false);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(clientServiceClient.getActiveClientIdsByAgentId(userId, "token"))
                .thenReturn(List.of());
        when(userRepository.save(user)).thenReturn(user);

        try (MockedStatic<TransactionSynchronizationManager> tsm =
                     mockStatic(TransactionSynchronizationManager.class)) {
            userService.deleteUser(userId, "token", actorId);
        }

        assertThat(user.getDeletedAt()).isNotNull();
        verify(sqsLogPublisher).publish(eq(actorId), eq("USER_DELETED"), eq("USER"),
                eq(userId), anyString());
    }

    @Test
    void deleteUser_agentWithClients_reassignsToRemainingAgents() {
        UUID deletedId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();

        User deletedAgent = buildUser(deletedId, "agent1@test.com", false, false);
        User otherAgent = buildUser(otherId, "agent2@test.com", false, false);

        when(userRepository.findById(deletedId)).thenReturn(Optional.of(deletedAgent));
        when(clientServiceClient.getActiveClientIdsByAgentId(deletedId, "token"))
                .thenReturn(List.of(clientId));
        when(userRepository.findAllByDeletedAtIsNull())
                .thenReturn(List.of(deletedAgent, otherAgent));
        when(clientServiceClient.getActiveClientIdsByAgentId(otherId, "token"))
                .thenReturn(List.of());
        when(userRepository.save(deletedAgent)).thenReturn(deletedAgent);

        try (MockedStatic<TransactionSynchronizationManager> tsm =
                     mockStatic(TransactionSynchronizationManager.class)) {
            userService.deleteUser(deletedId, "token", actorId);
        }

        verify(clientServiceClient).reassignClient(clientId, otherId, "token");
        assertThat(deletedAgent.getDeletedAt()).isNotNull();
    }

    @Test
    void deleteUser_agentWithClients_noOtherAgents_throwsIllegalArgument() {
        UUID deletedId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        User agent = buildUser(deletedId, "agent@test.com", false, false);
        User admin = buildUser(UUID.randomUUID(), "admin@test.com", true, false);

        when(userRepository.findById(deletedId)).thenReturn(Optional.of(agent));
        when(clientServiceClient.getActiveClientIdsByAgentId(deletedId, "token"))
                .thenReturn(List.of(clientId));
        when(userRepository.findAllByDeletedAtIsNull()).thenReturn(List.of(agent, admin));

        assertThatThrownBy(() -> userService.deleteUser(deletedId, "token", UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no other active agents");
    }

    @Test
    void deleteUser_rootAdmin_throwsIllegalArgument() {
        UUID userId = UUID.randomUUID();
        User rootAdmin = buildUser(userId, "root@test.com", true, true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(rootAdmin));

        assertThatThrownBy(() -> userService.deleteUser(userId, "token", UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("root admin");
    }

    @Test
    void deleteUser_alreadyDeleted_returnsEarlyWithoutSavingOrLogging() {
        UUID userId = UUID.randomUUID();
        User user = buildUser(userId, "a@test.com", false, false);
        user.setDeletedAt(Instant.now());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        userService.deleteUser(userId, "token", UUID.randomUUID());

        verify(userRepository, never()).save(any());
        verify(sqsLogPublisher, never()).publish(any(), any(), any(), any(), any());
    }

    @Test
    void deleteUser_notFound_throwsNotFound() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.deleteUser(userId, "token", UUID.randomUUID()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    // ─── getVisibleAuditLogs ──────────────────────────────────────────────────

    @Test
    void getVisibleAuditLogs_rootAdmin_returnsAllLogs() {
        AuthPrincipal principal = new AuthPrincipal(UUID.randomUUID(), "admin", true);
        List<AuditLogResponse> logs = List.of(
                new AuditLogResponse("1", "uid", "ACT", "USER", "eid",
                        "2024-01-02T00:00:00Z", "SUCCESS", "svc", null, null, null, null, null));
        when(auditLogRepository.findAllLogs()).thenReturn(logs);

        assertThat(userService.getVisibleAuditLogs(principal)).hasSize(1);
        verify(auditLogRepository).findAllLogs();
    }

    @Test
    void getVisibleAuditLogs_admin_includesAgentsAndOwnId() {
        UUID adminId = UUID.randomUUID();
        UUID agentId = UUID.randomUUID();
        AuthPrincipal principal = new AuthPrincipal(adminId, "admin", false);

        User agent = buildUser(agentId, "agent@test.com", false, false);
        when(userRepository.findAllByIsAdminFalse()).thenReturn(List.of(agent));

        List<AuditLogResponse> logs = List.of(
                new AuditLogResponse("1", agentId.toString(), "ACT", "USER", "eid",
                        "2024-01-02T00:00:00Z", "SUCCESS", "svc", null, null, null, null, null));
        when(auditLogRepository.findLogsByUserIds(anySet())).thenReturn(logs);

        List<AuditLogResponse> result = userService.getVisibleAuditLogs(principal);

        assertThat(result).hasSize(1);
        verify(auditLogRepository).findLogsByUserIds(argThat(ids ->
                ids.contains(agentId.toString()) && ids.contains(adminId.toString())));
    }

    @Test
    void getVisibleAuditLogs_agent_returnsOwnLogsOnly() {
        UUID agentId = UUID.randomUUID();
        AuthPrincipal principal = new AuthPrincipal(agentId, "agent", false);

        List<AuditLogResponse> logs = List.of(
                new AuditLogResponse("1", agentId.toString(), "ACT", "USER", "eid",
                        "2024-01-02T00:00:00Z", "SUCCESS", "svc", null, null, null, null, null));
        when(auditLogRepository.findLogsByUserId(agentId.toString())).thenReturn(logs);

        assertThat(userService.getVisibleAuditLogs(principal)).hasSize(1);
        verify(auditLogRepository).findLogsByUserId(agentId.toString());
    }

    @Test
    void getVisibleAuditLogs_agentWithNullUserId_returnsEmpty() {
        AuthPrincipal principal = new AuthPrincipal(null, "agent", false);
        assertThat(userService.getVisibleAuditLogs(principal)).isEmpty();
    }

    @Test
    void getVisibleAuditLogs_unknownRole_returnsEmpty() {
        AuthPrincipal principal = new AuthPrincipal(UUID.randomUUID(), "unknown", false);
        assertThat(userService.getVisibleAuditLogs(principal)).isEmpty();
    }

    @Test
    void getVisibleAuditLogs_multipleEntries_sortedByTimestampDescending() {
        AuthPrincipal principal = new AuthPrincipal(UUID.randomUUID(), "admin", true);
        List<AuditLogResponse> logs = List.of(
                new AuditLogResponse("1", "uid", "ACT", "USER", "e1",
                        "2024-01-01T00:00:00Z", "SUCCESS", "svc", null, null, null, null, null),
                new AuditLogResponse("2", "uid", "ACT", "USER", "e2",
                        "2024-03-01T00:00:00Z", "SUCCESS", "svc", null, null, null, null, null),
                new AuditLogResponse("3", "uid", "ACT", "USER", "e3",
                        "2024-02-01T00:00:00Z", "SUCCESS", "svc", null, null, null, null, null));
        when(auditLogRepository.findAllLogs()).thenReturn(logs);

        List<AuditLogResponse> result = userService.getVisibleAuditLogs(principal);

        assertThat(result).extracting(AuditLogResponse::logId)
                .containsExactly("2", "3", "1");
    }
}
