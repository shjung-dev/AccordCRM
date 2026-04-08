package com.example.client_service.controller;

import com.example.client_service.dto.ClientCreateRequest;
import com.example.client_service.dto.ClientUpdateRequest;
import com.example.client_service.dto.PagedResponse;
import com.example.client_service.model.Client;
import com.example.client_service.security.AuthPrincipal;
import com.example.client_service.service.ClientService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ClientControllerTest {

    @Mock private ClientService clientService;

    @InjectMocks
    private ClientController clientController;

    private UUID agentId;
    private UUID clientId;
    private Client sampleClient;

    @BeforeEach
    void setUp() {
        agentId = UUID.randomUUID();
        clientId = UUID.randomUUID();

        sampleClient = new Client();
        sampleClient.setClientId(clientId);
        sampleClient.setFirstName("John");
        sampleClient.setLastName("Doe");
        sampleClient.setEmailAddress("john.doe@example.com");
        sampleClient.setAssignedAgentId(agentId);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void setSecurityContext(UUID userId, String role, boolean isRootAdmin) {
        AuthPrincipal principal = new AuthPrincipal(userId, role, isRootAdmin);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    // ---- GET /api/clients ----

    @Test
    @DisplayName("GET / returns paged client list for admin")
    void getAllClients_asAdmin_returns200() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(clientService.getAllClients(any())).thenReturn(List.of(sampleClient));
        when(clientService.countAllClients()).thenReturn(1L);

        ResponseEntity<?> response = clientController.getAllClients(0, 10);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertInstanceOf(PagedResponse.class, response.getBody());
    }

    @Test
    @DisplayName("GET / returns paged client list for rootAdmin")
    void getAllClients_asRootAdmin_returns200() {
        setSecurityContext(UUID.randomUUID(), "admin", true);
        when(clientService.getAllClients(any())).thenReturn(List.of(sampleClient));
        when(clientService.countAllClients()).thenReturn(1L);

        ResponseEntity<?> response = clientController.getAllClients(0, 10);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    @DisplayName("GET / returns 403 for agent role")
    void getAllClients_asAgent_returns403() {
        setSecurityContext(agentId, "agent", false);

        ResponseEntity<?> response = clientController.getAllClients(null, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(clientService, never()).getAllClients(any(PageRequest.class));
    }

    @Test
    @DisplayName("GET / uses default page size when no params given (admin)")
    void getAllClients_asAdmin_noParams_usesDefaultPageSize() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(clientService.getAllClients(any())).thenReturn(List.of());
        when(clientService.countAllClients()).thenReturn(0L);

        ResponseEntity<?> response = clientController.getAllClients(null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(clientService).getAllClients(argThat(p -> p.getPageSize() == 50));
    }

    // ---- GET /api/clients/count ----

    @Test
    @DisplayName("GET /count returns count for admin")
    void getClientCount_asAdmin_returns200() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(clientService.countAllClients()).thenReturn(7L);

        ResponseEntity<Object> response = clientController.getClientCount();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(Map.of("count", 7L), response.getBody());
    }

    @Test
    @DisplayName("GET /count returns 403 for agent")
    void getClientCount_asAgent_returns403() {
        setSecurityContext(agentId, "agent", false);

        ResponseEntity<Object> response = clientController.getClientCount();

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(clientService, never()).countAllClients();
    }

    // ---- GET /api/clients/agent/{agentId} ----

    @Test
    @DisplayName("GET /agent/{id} returns full list when no pagination params (agent, own id)")
    void getClientsByAgentId_asAgent_ownId_noPagination_returns200() {
        setSecurityContext(agentId, "agent", false);
        when(clientService.getClientsByAgentId(agentId)).thenReturn(List.of(sampleClient));

        ResponseEntity<?> response = clientController.getClientsByAgentId(agentId, null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        List<Client> body = (List<Client>) response.getBody();
        assertEquals(1, body.size());
    }

    @Test
    @DisplayName("GET /agent/{id} returns paged response with pagination params (agent, own id)")
    void getClientsByAgentId_asAgent_ownId_withPagination_returns200() {
        setSecurityContext(agentId, "agent", false);
        when(clientService.getClientsByAgentId(eq(agentId), any())).thenReturn(List.of(sampleClient));
        when(clientService.countClientsByAgentId(agentId)).thenReturn(1L);

        ResponseEntity<?> response = clientController.getClientsByAgentId(agentId, 0, 10);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertInstanceOf(PagedResponse.class, response.getBody());
    }

    @Test
    @DisplayName("GET /agent/{id} returns 403 when agent requests a different agent's clients")
    void getClientsByAgentId_asAgent_differentId_returns403() {
        setSecurityContext(agentId, "agent", false);
        UUID otherId = UUID.randomUUID();

        ResponseEntity<?> response = clientController.getClientsByAgentId(otherId, null, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(clientService, never()).getClientsByAgentId(any());
    }

    @Test
    @DisplayName("GET /agent/{id} returns 403 for admin role")
    void getClientsByAgentId_asAdmin_returns403() {
        setSecurityContext(UUID.randomUUID(), "admin", false);

        ResponseEntity<?> response = clientController.getClientsByAgentId(agentId, null, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // ---- GET /api/clients/{id} ----

    @Test
    @DisplayName("GET /{id} returns client for admin")
    void getClientById_asAdmin_returns200() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient);

        ResponseEntity<Client> response = clientController.getClientById(clientId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(clientId, response.getBody().getClientId());
    }

    @Test
    @DisplayName("GET /{id} returns client for agent who owns the client")
    void getClientById_asAgent_ownClient_returns200() {
        setSecurityContext(agentId, "agent", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient);

        ResponseEntity<Client> response = clientController.getClientById(clientId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    @DisplayName("GET /{id} returns 403 for agent who does not own the client")
    void getClientById_asAgent_otherAgentsClient_returns403() {
        UUID otherAgent = UUID.randomUUID();
        setSecurityContext(otherAgent, "agent", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient); // assigned to agentId

        ResponseEntity<Client> response = clientController.getClientById(clientId);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // ---- POST /api/clients ----

    @Test
    @DisplayName("POST / returns 201 when agent creates client without specifying agentId (uses principal)")
    void createClient_asAgent_noAgentIdInBody_returns201() {
        setSecurityContext(agentId, "agent", false);
        when(clientService.saveClient(any(Client.class), eq(agentId))).thenReturn(sampleClient);

        ResponseEntity<Client> response = clientController.createClient(buildValidCreateRequest(null));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("POST / returns 201 when agent creates client with matching agentId in body")
    void createClient_asAgent_matchingAgentId_returns201() {
        setSecurityContext(agentId, "agent", false);
        when(clientService.saveClient(any(Client.class), eq(agentId))).thenReturn(sampleClient);

        ResponseEntity<Client> response = clientController.createClient(buildValidCreateRequest(agentId));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
    }

    @Test
    @DisplayName("POST / returns 403 when agent specifies a different agent's ID in body")
    void createClient_asAgent_mismatchedAgentId_returns403() {
        setSecurityContext(agentId, "agent", false);
        UUID otherId = UUID.randomUUID();

        ResponseEntity<Client> response = clientController.createClient(buildValidCreateRequest(otherId));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(clientService, never()).saveClient(any(), any());
    }

    @Test
    @DisplayName("POST / returns 403 for admin role")
    void createClient_asAdmin_returns403() {
        setSecurityContext(UUID.randomUUID(), "admin", false);

        ResponseEntity<Client> response = clientController.createClient(buildValidCreateRequest(null));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(clientService, never()).saveClient(any(), any());
    }

    // ---- PUT /api/clients/{id} ----

    @Test
    @DisplayName("PUT /{id} returns 200 when admin reassigns client to new agent")
    void updateClient_asAdmin_reassignOnly_returns200() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient);
        when(clientService.updateClient(eq(clientId), any(Client.class), any(UUID.class)))
                .thenReturn(sampleClient);

        ClientUpdateRequest req = new ClientUpdateRequest();
        req.setAssignedAgentId(UUID.randomUUID());

        ResponseEntity<Client> response = clientController.updateClient(clientId, req);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    @DisplayName("PUT /{id} returns 403 when admin provides no assignedAgentId")
    void updateClient_asAdmin_noAssignedAgentId_returns403() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient);

        ClientUpdateRequest req = new ClientUpdateRequest(); // assignedAgentId is null

        ResponseEntity<Client> response = clientController.updateClient(clientId, req);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("PUT /{id} throws 400 when admin sends non-reassignment fields")
    void updateClient_asAdmin_withOtherFields_throws400() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient);

        ClientUpdateRequest req = new ClientUpdateRequest();
        req.setAssignedAgentId(UUID.randomUUID());
        req.setFirstName("Hacker"); // not allowed for admin

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> clientController.updateClient(clientId, req));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    @DisplayName("PUT /{id} returns 200 when agent updates their own client")
    void updateClient_asAgent_ownClient_returns200() {
        setSecurityContext(agentId, "agent", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient); // assigned to agentId
        when(clientService.updateClient(eq(clientId), any(Client.class), eq(agentId)))
                .thenReturn(sampleClient);

        ClientUpdateRequest req = new ClientUpdateRequest();
        req.setFirstName("Updated");

        ResponseEntity<Client> response = clientController.updateClient(clientId, req);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    @DisplayName("PUT /{id} returns 403 when agent tries to update another agent's client")
    void updateClient_asAgent_otherAgentsClient_returns403() {
        UUID otherAgent = UUID.randomUUID();
        setSecurityContext(otherAgent, "agent", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient); // assigned to agentId

        ResponseEntity<Client> response = clientController.updateClient(clientId, new ClientUpdateRequest());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(clientService, never()).updateClient(any(), any(), any());
    }

    @Test
    @DisplayName("PUT /{id} returns 403 when agent tries to reassign client to different agent")
    void updateClient_asAgent_tryingToReassign_returns403() {
        setSecurityContext(agentId, "agent", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient);

        ClientUpdateRequest req = new ClientUpdateRequest();
        req.setAssignedAgentId(UUID.randomUUID()); // different agent

        ResponseEntity<Client> response = clientController.updateClient(clientId, req);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(clientService, never()).updateClient(any(), any(), any());
    }

    // ---- PUT /api/clients/{id}/verify ----

    @Test
    @DisplayName("PUT /{id}/verify returns 200 when agent verifies their own client")
    void verifyClient_asAgent_ownClient_returns200() {
        setSecurityContext(agentId, "agent", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient);
        when(clientService.verifyClient(eq(clientId), eq("SingPass"), eq(agentId)))
                .thenReturn(sampleClient);

        ResponseEntity<?> response = clientController.verifyClient(clientId,
                Map.of("verificationMethod", "SingPass"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    @DisplayName("PUT /{id}/verify returns 403 for admin role")
    void verifyClient_asAdmin_returns403() {
        setSecurityContext(UUID.randomUUID(), "admin", false);

        ResponseEntity<?> response = clientController.verifyClient(clientId, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(clientService, never()).verifyClient(any(), any(), any());
    }

    @Test
    @DisplayName("PUT /{id}/verify returns 403 when agent does not own the client")
    void verifyClient_asAgent_otherAgentsClient_returns403() {
        UUID otherAgent = UUID.randomUUID();
        setSecurityContext(otherAgent, "agent", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient); // assigned to agentId

        ResponseEntity<?> response = clientController.verifyClient(clientId, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(clientService, never()).verifyClient(any(), any(), any());
    }

    @Test
    @DisplayName("PUT /{id}/verify passes null verificationMethod when body is null")
    void verifyClient_nullBody_passesNullMethod() {
        setSecurityContext(agentId, "agent", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient);
        when(clientService.verifyClient(eq(clientId), isNull(), eq(agentId)))
                .thenReturn(sampleClient);

        ResponseEntity<?> response = clientController.verifyClient(clientId, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(clientService).verifyClient(clientId, null, agentId);
    }

    // ---- DELETE /api/clients/{id} ----

    @Test
    @DisplayName("DELETE /{id} returns 204 when agent deletes their own client")
    void deleteClient_asAgent_ownClient_returns204() {
        setSecurityContext(agentId, "agent", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient);

        ResponseEntity<Void> response = clientController.deleteClient(clientId,
                Map.of("deletionReason", "Client requested"));

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(clientService).deleteClient(eq(clientId), eq("Client requested"), eq(agentId));
    }

    @Test
    @DisplayName("DELETE /{id} returns 403 for admin role")
    void deleteClient_asAdmin_returns403() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient);

        ResponseEntity<Void> response = clientController.deleteClient(clientId, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(clientService, never()).deleteClient(any(), any(), any());
    }

    @Test
    @DisplayName("DELETE /{id} returns 403 when agent does not own the client")
    void deleteClient_asAgent_otherAgentsClient_returns403() {
        UUID otherAgent = UUID.randomUUID();
        setSecurityContext(otherAgent, "agent", false);
        when(clientService.findById(clientId)).thenReturn(sampleClient); // assigned to agentId

        ResponseEntity<Void> response = clientController.deleteClient(clientId, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(clientService, never()).deleteClient(any(), any(), any());
    }

    // ---- GET /api/clients/agent/{agentId}/ids ----

    @Test
    @DisplayName("GET /agent/{id}/ids returns client IDs for admin")
    void getClientIdsByAgentId_asAdmin_returns200() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(clientService.getClientsByAgentId(agentId)).thenReturn(List.of(sampleClient));

        ResponseEntity<List<UUID>> response = clientController.getClientIdsByAgentId(agentId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(List.of(clientId), response.getBody());
    }

    @Test
    @DisplayName("GET /agent/{id}/ids returns 403 for agent role")
    void getClientIdsByAgentId_asAgent_returns403() {
        setSecurityContext(agentId, "agent", false);

        ResponseEntity<List<UUID>> response = clientController.getClientIdsByAgentId(agentId);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(clientService, never()).getClientsByAgentId(any());
    }

    // ---- GET /api/clients/health ----

    @Test
    @DisplayName("GET /health returns 200 with 'Service is UP'")
    void healthCheck_returns200() {
        ResponseEntity<String> response = clientController.healthCheck();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Service is UP", response.getBody());
    }

    // ---- Helper ----

    private ClientCreateRequest buildValidCreateRequest(UUID assignedAgentId) {
        ClientCreateRequest req = new ClientCreateRequest();
        req.setFirstName("Alice");
        req.setLastName("Smith");
        req.setDateOfBirth(LocalDate.of(1995, 6, 15));
        req.setGender("Female");
        req.setEmailAddress("alice.smith@example.com");
        req.setPhoneNumber("+6598765432");
        req.setAddress("456 Side St");
        req.setCity("Singapore");
        req.setState("Singapore");
        req.setCountry("Singapore");
        req.setPostalCode("654321");
        req.setIdentificationNumber("S9876543B");
        req.setAssignedAgentId(assignedAgentId);
        return req;
    }
}
