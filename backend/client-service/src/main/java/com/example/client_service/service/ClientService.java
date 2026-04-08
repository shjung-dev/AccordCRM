package com.example.client_service.service;

import com.example.client_service.integration.AccountServiceClient;
import com.example.client_service.model.Client;
import com.example.client_service.repository.ClientRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;

import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.UUID;

@Service
public class ClientService {

    private static final Logger log = LoggerFactory.getLogger(ClientService.class);

    private final ClientRepository clientRepository;
    private final SqsLogPublisher sqsLogPublisher;
    private final SqsEmailPublisher sqsEmailPublisher;
    private final AccountServiceClient accountServiceClient;

    public ClientService(ClientRepository clientRepository, SqsLogPublisher sqsLogPublisher,
            SqsEmailPublisher sqsEmailPublisher, AccountServiceClient accountServiceClient) {
        this.clientRepository = clientRepository;
        this.sqsLogPublisher = sqsLogPublisher;
        this.sqsEmailPublisher = sqsEmailPublisher;
        this.accountServiceClient = accountServiceClient;
    }

    // ------------------
    // Read Cache
    // ------------------
    @Cacheable(value = "clients-by-id", key = "#clientId")
    @Transactional(readOnly = true)
    public Client findById(UUID clientId) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found with ID: " + clientId));
        if (client.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found with ID: " + clientId);
        }
        return client;
    }

    @Cacheable(value = "clients-by-agent", key = "#agentId")
    @Transactional(readOnly = true)
    public List<Client> getClientsByAgentId(UUID agentId) {
        return clientRepository.findAllByAssignedAgentIdAndDeletedAtIsNull(agentId);
    }

    @Cacheable(value = "client-count-by-agent", key = "#agentId")
    @Transactional(readOnly = true)
    public long countClientsByAgentId(UUID agentId) {
        return clientRepository.countByAssignedAgentIdAndDeletedAtIsNull(agentId);
    }

    // ------------------
    // Write -> Evict / Update Cache
    // ------------------
    @Caching(evict = { // Remove cache that matches the assigned agent id of new client
            @CacheEvict(value = "clients-by-agent", key = "#client.assignedAgentId"),
            @CacheEvict(value = "client-count-by-agent", key = "#client.assignedAgentId")
    })
    @Transactional
    public Client saveClient(Client client, UUID actorId) {
        validateClientData(client);
        Client newClient = clientRepository.save(client);
        // Send welcome and verify email to client
        String creationReason = "Created client profile for " + newClient.getFirstName() + " " + newClient.getLastName();
        sqsEmailPublisher.publishEmail("WELCOME", newClient.getEmailAddress(), newClient.getFirstName(),
                newClient.getLastName());
        sqsLogPublisher.publish(actorId, "CLIENT_CREATED", "CLIENT", newClient.getClientId(), creationReason);
        return newClient;
    }

    @Caching(put = {
            @CachePut(value = "clients-by-id", key = "#clientId")
    }, evict = { // Evict old agent's cache
            @CacheEvict(value = "clients-by-agent", key = "#actorId"),
            @CacheEvict(value = "client-count-by-agent", key = "#actorId")
    })
    @Transactional
    public Client updateClient(UUID clientId, Client details, UUID actorId) {
        Client existingClient = findById(clientId);

        if (details.getFirstName() != null)
            existingClient.setFirstName(details.getFirstName());
        if (details.getLastName() != null)
            existingClient.setLastName(details.getLastName());
        if (details.getDateOfBirth() != null)
            existingClient.setDateOfBirth(details.getDateOfBirth());
        if (details.getGender() != null)
            existingClient.setGender(details.getGender());
        if (details.getAddress() != null)
            existingClient.setAddress(details.getAddress());
        if (details.getEmailAddress() != null) {
            existingClient.setEmailAddress(details.getEmailAddress());
        }
        if (details.getPhoneNumber() != null)
            existingClient.setPhoneNumber(details.getPhoneNumber());
        if (details.getCity() != null)
            existingClient.setCity(details.getCity());
        if (details.getState() != null)
            existingClient.setState(details.getState());
        if (details.getCountry() != null)
            existingClient.setCountry(details.getCountry());
        if (details.getPostalCode() != null)
            existingClient.setPostalCode(details.getPostalCode());
        if (details.getAssignedAgentId() != null) {
            existingClient.setAssignedAgentId(details.getAssignedAgentId());
        }
        if (details.getIdentificationNumber() != null)
            existingClient.setIdentificationNumber(details.getIdentificationNumber());

        validateClientData(existingClient);
        Client updated = clientRepository.save(existingClient);
        // send email
        sqsEmailPublisher.publishEmail("PROFILE_UPDATE", updated.getEmailAddress(), updated.getFirstName(),
                updated.getLastName());
        String updateReason = "Updated client profile for " + updated.getFirstName() + " " + updated.getLastName();
        sqsLogPublisher.publish(actorId, "CLIENT_UPDATED", "CLIENT", updated.getClientId(), updateReason);
        return updated;
    }

    @Caching(evict = { // Remove all the caches related to deleted client and assigned agent
            @CacheEvict(value = "clients-by-id", key = "#clientId"),
            @CacheEvict(value = "clients-by-agent", key = "#actorId"),
            @CacheEvict(value = "client-count-by-agent", key = "#actorId")
    })
    @Transactional
    public void deleteClient(UUID clientId, String deletionReason, UUID actorId) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cannot delete: Client not found"));
        if (client.getDeletedAt() != null) {
            return;
        }
        client.setDeletionReason(deletionReason);
        client.setDeletedAt(Instant.now());
        clientRepository.save(client);

        // Cascade: delete all accounts and transactions for this client
        log.info("deleteClient — calling accountServiceClient.deleteAccountsByClientId for clientId={}", clientId);
        try {
            accountServiceClient.deleteAccountsByClientId(clientId, actorId);
            log.info("deleteClient — accountServiceClient.deleteAccountsByClientId succeeded for clientId={}", clientId);
        } catch (Exception e) {
            log.error("deleteClient — accountServiceClient.deleteAccountsByClientId failed for clientId={}: {}", clientId, e.getMessage(), e);
            throw e;
        }

        // Notify client their profile has been closed
        sqsEmailPublisher.publishEmail("PROFILE_DELETED", client.getEmailAddress(), client.getFirstName(),
                client.getLastName());
        String clientDeletionReason = "Deleted client profile for " + client.getFirstName() + " " + client.getLastName() + ". Reason: " + deletionReason;
        sqsLogPublisher.publish(actorId, "CLIENT_DELETED", "CLIENT", clientId, clientDeletionReason);
    }

    @CachePut(value = "clients-by-id", key = "#clientId") //Update the value of the client for cache with this clientId
    @Transactional
    public Client verifyClient(UUID clientId, String verificationMethod, UUID actorId) {
        Client client = findById(clientId);
        if (client.getVerifiedAt() != null) {
            throw new IllegalArgumentException("Client is already verified");
        }
        if (verificationMethod == null || verificationMethod.isBlank()) {
            throw new IllegalArgumentException("At least one verification method must be selected");
        }
        client.setVerifiedAt(Instant.now());
        client.setVerificationMethod(verificationMethod);
        Client verifiedClient = clientRepository.save(client);

        // Notify the client that their identity is verified
        sqsEmailPublisher.publishEmail("VERIFICATION", verifiedClient.getEmailAddress(),
                verifiedClient.getFirstName(), verifiedClient.getLastName());
        String verificationReason = "Verified client profile for " + verifiedClient.getFirstName() + " " + verifiedClient.getLastName() + ". Verification method: " + verificationMethod;
        sqsLogPublisher.publish(actorId, "CLIENT_VERIFICATION_PASSED", "CLIENT", verifiedClient.getClientId(), verificationReason);
        return verifiedClient;
    }

    @Transactional(readOnly = true)
    public List<Client> getAllClients() {
        return clientRepository.findAllByDeletedAtIsNull();
    }

    @Transactional(readOnly = true)
    public List<Client> getAllClients(Pageable pageable) {
        return clientRepository.findAllByDeletedAtIsNull(pageable).getContent();
    }

    @Transactional(readOnly = true)
    public long countAllClients() {
        return clientRepository.countByDeletedAtIsNull();
    }

    @Transactional(readOnly = true)
    public List<Client> getClientsByAgentId(UUID agentId, Pageable pageable) {
        return clientRepository.findAllByAssignedAgentIdAndDeletedAtIsNull(agentId, pageable).getContent();
    }

    private void validateClientData(Client client) {
        if (client.getFirstName() == null || client.getFirstName().isBlank()) {
            throw new IllegalArgumentException("First Name is mandatory");
        }
        if (client.getEmailAddress() == null || !client.getEmailAddress().contains("@")) {
            throw new IllegalArgumentException("A valid Email is mandatory");
        }

        if (client.getDateOfBirth() != null) {
            int age = Period.between(client.getDateOfBirth(), LocalDate.now()).getYears();
            if (age < 18 || age > 100) {
                throw new IllegalArgumentException("Client age must be between 18 and 100");
            }
        }

        if (client.getClientId() == null) {

            if (clientRepository.existsByEmailAddressAndDeletedAtIsNull(client.getEmailAddress())) {
                throw new IllegalArgumentException("Email address is already in use");
            }
        } else {
            if (clientRepository.existsByEmailAddressAndClientIdNotAndDeletedAtIsNull(
                    client.getEmailAddress(), client.getClientId())) {
                throw new IllegalArgumentException("Email address is already in use");
            }

        }
    }
}
