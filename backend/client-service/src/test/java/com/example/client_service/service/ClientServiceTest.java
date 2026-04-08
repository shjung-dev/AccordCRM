package com.example.client_service.service;

import com.example.client_service.integration.AccountServiceClient;
import com.example.client_service.model.Client;
import com.example.client_service.repository.ClientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ClientServiceTest {

    @Mock private ClientRepository clientRepository;
    @Mock private SqsLogPublisher sqsLogPublisher;
    @Mock private SqsEmailPublisher sqsEmailPublisher;
    @Mock private AccountServiceClient accountServiceClient;

    @InjectMocks
    private ClientService clientService;

    private UUID clientId;
    private UUID agentId;
    private Client activeClient;

    @BeforeEach
    void setUp() {
        clientId = UUID.randomUUID();
        agentId = UUID.randomUUID();

        activeClient = new Client();
        activeClient.setClientId(clientId);
        activeClient.setFirstName("John");
        activeClient.setLastName("Doe");
        activeClient.setEmailAddress("john.doe@example.com");
        activeClient.setDateOfBirth(LocalDate.of(1990, 1, 1));
        activeClient.setGender("Male");
        activeClient.setPhoneNumber("+6591234567");
        activeClient.setAddress("123 Main St");
        activeClient.setCity("Singapore");
        activeClient.setState("Singapore");
        activeClient.setCountry("Singapore");
        activeClient.setPostalCode("123456");
        activeClient.setAssignedAgentId(agentId);
        activeClient.setIdentificationNumber("S1234567A");
        activeClient.setDeletedAt(null);
    }

    // ---- findById ----

    @Test
    @DisplayName("findById returns client when found and not deleted")
    void findById_found_returnsClient() {
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(activeClient));

        Client result = clientService.findById(clientId);

        assertNotNull(result);
        assertEquals(clientId, result.getClientId());
    }

    @Test
    @DisplayName("findById throws 404 when client does not exist")
    void findById_notFound_throws404() {
        when(clientRepository.findById(clientId)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> clientService.findById(clientId));

        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("findById throws 404 when client is soft-deleted")
    void findById_softDeleted_throws404() {
        activeClient.setDeletedAt(Instant.now());
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(activeClient));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> clientService.findById(clientId));

        assertEquals(404, ex.getStatusCode().value());
    }

    // ---- getClientsByAgentId (no pagination) ----

    @Test
    @DisplayName("getClientsByAgentId returns clients for the agent")
    void getClientsByAgentId_returnsAgentClients() {
        when(clientRepository.findAllByAssignedAgentIdAndDeletedAtIsNull(agentId))
                .thenReturn(List.of(activeClient));

        List<Client> result = clientService.getClientsByAgentId(agentId);

        assertEquals(1, result.size());
        assertEquals(clientId, result.get(0).getClientId());
    }

    // ---- getClientsByAgentId (with pagination) ----

    @Test
    @DisplayName("getClientsByAgentId with pageable returns paged clients")
    void getClientsByAgentId_withPageable_returnsPagedClients() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Client> page = new PageImpl<>(List.of(activeClient));
        when(clientRepository.findAllByAssignedAgentIdAndDeletedAtIsNull(agentId, pageable))
                .thenReturn(page);

        List<Client> result = clientService.getClientsByAgentId(agentId, pageable);

        assertEquals(1, result.size());
    }

    // ---- countClientsByAgentId ----

    @Test
    @DisplayName("countClientsByAgentId returns correct count")
    void countClientsByAgentId_returnsCount() {
        when(clientRepository.countByAssignedAgentIdAndDeletedAtIsNull(agentId)).thenReturn(3L);

        long count = clientService.countClientsByAgentId(agentId);

        assertEquals(3L, count);
    }

    // ---- getAllClients ----

    @Test
    @DisplayName("getAllClients returns all non-deleted clients")
    void getAllClients_returnsAllClients() {
        when(clientRepository.findAllByDeletedAtIsNull()).thenReturn(List.of(activeClient));

        List<Client> result = clientService.getAllClients();

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getAllClients with pageable returns paged clients")
    void getAllClients_withPageable_returnsPagedClients() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Client> page = new PageImpl<>(List.of(activeClient));
        when(clientRepository.findAllByDeletedAtIsNull(pageable)).thenReturn(page);

        List<Client> result = clientService.getAllClients(pageable);

        assertEquals(1, result.size());
    }

    // ---- countAllClients ----

    @Test
    @DisplayName("countAllClients returns total non-deleted client count")
    void countAllClients_returnsCount() {
        when(clientRepository.countByDeletedAtIsNull()).thenReturn(5L);

        long count = clientService.countAllClients();

        assertEquals(5L, count);
    }

    // ---- saveClient ----

    @Test
    @DisplayName("saveClient saves client and publishes welcome email and log")
    void saveClient_success_savesAndPublishes() {
        Client newClient = buildNewClient();
        when(clientRepository.existsByEmailAddressAndDeletedAtIsNull(newClient.getEmailAddress()))
                .thenReturn(false);
        when(clientRepository.save(newClient)).thenReturn(activeClient);

        Client result = clientService.saveClient(newClient, agentId);

        assertNotNull(result);
        verify(clientRepository).save(newClient);
        verify(sqsEmailPublisher).publishEmail(eq("WELCOME"), eq(activeClient.getEmailAddress()),
                eq(activeClient.getFirstName()), eq(activeClient.getLastName()));
        verify(sqsLogPublisher).publish(eq(agentId), eq("CLIENT_CREATED"), eq("CLIENT"),
                eq(activeClient.getClientId()), anyString());
    }

    @Test
    @DisplayName("saveClient throws IllegalArgumentException when firstName is blank")
    void saveClient_blankFirstName_throwsIllegalArgument() {
        Client newClient = buildNewClient();
        newClient.setFirstName("  ");

        assertThrows(IllegalArgumentException.class,
                () -> clientService.saveClient(newClient, agentId));

        verify(clientRepository, never()).save(any());
    }

    @Test
    @DisplayName("saveClient throws IllegalArgumentException when email is invalid")
    void saveClient_invalidEmail_throwsIllegalArgument() {
        Client newClient = buildNewClient();
        newClient.setEmailAddress("not-an-email");

        assertThrows(IllegalArgumentException.class,
                () -> clientService.saveClient(newClient, agentId));

        verify(clientRepository, never()).save(any());
    }

    @Test
    @DisplayName("saveClient throws IllegalArgumentException when client is under 18")
    void saveClient_under18_throwsIllegalArgument() {
        Client newClient = buildNewClient();
        newClient.setDateOfBirth(LocalDate.now().minusYears(17));

        assertThrows(IllegalArgumentException.class,
                () -> clientService.saveClient(newClient, agentId));

        verify(clientRepository, never()).save(any());
    }

    @Test
    @DisplayName("saveClient throws IllegalArgumentException when client is over 100")
    void saveClient_over100_throwsIllegalArgument() {
        Client newClient = buildNewClient();
        newClient.setDateOfBirth(LocalDate.now().minusYears(101));

        assertThrows(IllegalArgumentException.class,
                () -> clientService.saveClient(newClient, agentId));

        verify(clientRepository, never()).save(any());
    }

    @Test
    @DisplayName("saveClient throws IllegalArgumentException when email is already in use")
    void saveClient_duplicateEmail_throwsIllegalArgument() {
        Client newClient = buildNewClient();
        when(clientRepository.existsByEmailAddressAndDeletedAtIsNull(newClient.getEmailAddress()))
                .thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> clientService.saveClient(newClient, agentId));

        verify(clientRepository, never()).save(any());
    }

    // ---- updateClient ----

    @Test
    @DisplayName("updateClient patches provided fields and publishes update email and log")
    void updateClient_success_updatesAndPublishes() {
        Client details = new Client();
        details.setFirstName("Jane");
        details.setEmailAddress("jane.doe@example.com");

        when(clientRepository.findById(clientId)).thenReturn(Optional.of(activeClient));
        when(clientRepository.existsByEmailAddressAndClientIdNotAndDeletedAtIsNull(
                "jane.doe@example.com", clientId)).thenReturn(false);
        when(clientRepository.save(activeClient)).thenReturn(activeClient);

        Client result = clientService.updateClient(clientId, details, agentId);

        assertNotNull(result);
        assertEquals("Jane", activeClient.getFirstName());
        assertEquals("jane.doe@example.com", activeClient.getEmailAddress());
        verify(sqsEmailPublisher).publishEmail(eq("PROFILE_UPDATE"), any(), any(), any());
        verify(sqsLogPublisher).publish(eq(agentId), eq("CLIENT_UPDATED"), eq("CLIENT"),
                eq(clientId), anyString());
    }

    @Test
    @DisplayName("updateClient ignores null fields and keeps existing values")
    void updateClient_nullFields_keepsExistingValues() {
        Client details = new Client(); // all fields null

        when(clientRepository.findById(clientId)).thenReturn(Optional.of(activeClient));
        when(clientRepository.existsByEmailAddressAndClientIdNotAndDeletedAtIsNull(
                activeClient.getEmailAddress(), clientId)).thenReturn(false);
        when(clientRepository.save(activeClient)).thenReturn(activeClient);

        clientService.updateClient(clientId, details, agentId);

        assertEquals("John", activeClient.getFirstName());
        assertEquals("john.doe@example.com", activeClient.getEmailAddress());
    }

    @Test
    @DisplayName("updateClient throws 404 when client does not exist")
    void updateClient_notFound_throws404() {
        when(clientRepository.findById(clientId)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> clientService.updateClient(clientId, new Client(), agentId));

        assertEquals(404, ex.getStatusCode().value());
        verify(clientRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateClient throws IllegalArgumentException when updated email is already in use")
    void updateClient_duplicateEmail_throwsIllegalArgument() {
        Client details = new Client();
        details.setEmailAddress("taken@example.com");

        when(clientRepository.findById(clientId)).thenReturn(Optional.of(activeClient));
        when(clientRepository.existsByEmailAddressAndClientIdNotAndDeletedAtIsNull(
                "taken@example.com", clientId)).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> clientService.updateClient(clientId, details, agentId));

        verify(clientRepository, never()).save(any());
    }

    // ---- deleteClient ----

    @Test
    @DisplayName("deleteClient soft-deletes client, cascades to accounts, and publishes deletion email and log")
    void deleteClient_success_softDeletesAndCascades() {
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(activeClient));
        when(clientRepository.save(activeClient)).thenReturn(activeClient);

        clientService.deleteClient(clientId, "Account closure requested", agentId);

        assertNotNull(activeClient.getDeletedAt());
        assertEquals("Account closure requested", activeClient.getDeletionReason());
        verify(clientRepository).save(activeClient);
        verify(accountServiceClient).deleteAccountsByClientId(clientId, agentId);
        verify(sqsEmailPublisher).publishEmail(eq("PROFILE_DELETED"), any(), any(), any());
        verify(sqsLogPublisher).publish(eq(agentId), eq("CLIENT_DELETED"), eq("CLIENT"),
                eq(clientId), anyString());
    }

    @Test
    @DisplayName("deleteClient is a no-op when client is already soft-deleted")
    void deleteClient_alreadyDeleted_skipsAll() {
        activeClient.setDeletedAt(Instant.now());
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(activeClient));

        clientService.deleteClient(clientId, "duplicate", agentId);

        verify(clientRepository, never()).save(any());
        verify(accountServiceClient, never()).deleteAccountsByClientId(any(), any());
        verify(sqsEmailPublisher, never()).publishEmail(any(), any(), any(), any());
    }

    @Test
    @DisplayName("deleteClient throws 404 when client does not exist")
    void deleteClient_notFound_throws404() {
        when(clientRepository.findById(clientId)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> clientService.deleteClient(clientId, "reason", agentId));

        assertEquals(404, ex.getStatusCode().value());
        verify(clientRepository, never()).save(any());
    }

    @Test
    @DisplayName("deleteClient propagates exception when account service cascade fails")
    void deleteClient_cascadeFails_propagatesException() {
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(activeClient));
        when(clientRepository.save(activeClient)).thenReturn(activeClient);
        doThrow(new RuntimeException("account service down"))
                .when(accountServiceClient).deleteAccountsByClientId(clientId, agentId);

        assertThrows(RuntimeException.class,
                () -> clientService.deleteClient(clientId, "reason", agentId));
    }

    // ---- verifyClient ----

    @Test
    @DisplayName("verifyClient sets verifiedAt and method, publishes verification email and log")
    void verifyClient_success_verifiesAndPublishes() {
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(activeClient));
        when(clientRepository.save(activeClient)).thenReturn(activeClient);

        Client result = clientService.verifyClient(clientId, "SingPass", agentId);

        assertNotNull(result);
        assertNotNull(activeClient.getVerifiedAt());
        assertEquals("SingPass", activeClient.getVerificationMethod());
        verify(sqsEmailPublisher).publishEmail(eq("VERIFICATION"), any(), any(), any());
        verify(sqsLogPublisher).publish(eq(agentId), eq("CLIENT_VERIFICATION_PASSED"), eq("CLIENT"),
                eq(clientId), anyString());
    }

    @Test
    @DisplayName("verifyClient throws IllegalArgumentException when client is already verified")
    void verifyClient_alreadyVerified_throwsIllegalArgument() {
        activeClient.setVerifiedAt(Instant.now());
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(activeClient));

        assertThrows(IllegalArgumentException.class,
                () -> clientService.verifyClient(clientId, "SingPass", agentId));

        verify(clientRepository, never()).save(any());
    }

    @Test
    @DisplayName("verifyClient throws IllegalArgumentException when verificationMethod is null")
    void verifyClient_nullMethod_throwsIllegalArgument() {
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(activeClient));

        assertThrows(IllegalArgumentException.class,
                () -> clientService.verifyClient(clientId, null, agentId));

        verify(clientRepository, never()).save(any());
    }

    @Test
    @DisplayName("verifyClient throws IllegalArgumentException when verificationMethod is blank")
    void verifyClient_blankMethod_throwsIllegalArgument() {
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(activeClient));

        assertThrows(IllegalArgumentException.class,
                () -> clientService.verifyClient(clientId, "   ", agentId));

        verify(clientRepository, never()).save(any());
    }

    // ---- Helper ----

    private Client buildNewClient() {
        Client client = new Client(); // clientId is null (not yet persisted)
        client.setFirstName("Alice");
        client.setLastName("Smith");
        client.setEmailAddress("alice.smith@example.com");
        client.setDateOfBirth(LocalDate.of(1995, 6, 15));
        client.setGender("Female");
        client.setPhoneNumber("+6598765432");
        client.setAddress("456 Side St");
        client.setCity("Singapore");
        client.setState("Singapore");
        client.setCountry("Singapore");
        client.setPostalCode("654321");
        client.setAssignedAgentId(agentId);
        client.setIdentificationNumber("S9876543B");
        return client;
    }
}
