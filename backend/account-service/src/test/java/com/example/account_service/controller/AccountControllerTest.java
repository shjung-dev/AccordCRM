package com.example.account_service.controller;

import com.example.account_service.dto.AccountCreateRequest;
import com.example.account_service.integration.ClientDirectoryClient;
import com.example.account_service.integration.ClientRecord;
import com.example.account_service.model.Account;
import com.example.account_service.security.AuthPrincipal;
import com.example.account_service.service.AccountService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AccountControllerTest {

    @Mock private AccountService accountService;
    @Mock private ClientDirectoryClient clientDirectoryClient;

    @InjectMocks
    private AccountController accountController;

    private UUID agentId;
    private UUID clientId;
    private UUID accountId;
    private Account sampleAccount;
    private ClientRecord sampleClient;

    @BeforeEach
    void setUp() {
        agentId = UUID.randomUUID();
        clientId = UUID.randomUUID();
        accountId = UUID.randomUUID();

        sampleAccount = new Account();
        sampleAccount.setAccountId(accountId);
        sampleAccount.setClientId(clientId);
        sampleAccount.setAccountType("Checking");
        sampleAccount.setAccountStatus("Active");
        sampleAccount.setAssignedAgentId(agentId);

        sampleClient = new ClientRecord();
        sampleClient.setClientId(clientId);
        sampleClient.setAssignedAgentId(agentId);
        sampleClient.setFirstName("Jane");
        sampleClient.setLastName("Smith");
        sampleClient.setEmailAddress("jane.smith@example.com");
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

    // ---- GET / ----

    @Test
    @DisplayName("GET / returns all accounts for admin role")
    void getAccounts_asAdmin_returnsAll() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(accountService.findAll()).thenReturn(List.of(sampleAccount));

        ResponseEntity<List<Account>> response = accountController.getAccounts(null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    @DisplayName("GET / returns all accounts for rootAdmin role")
    void getAccounts_asRootAdmin_returnsAll() {
        setSecurityContext(UUID.randomUUID(), "admin", true);
        when(accountService.findAll()).thenReturn(List.of(sampleAccount));

        ResponseEntity<List<Account>> response = accountController.getAccounts(null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    @DisplayName("GET / returns agent's own accounts for agent role")
    void getAccounts_asAgent_returnsAgentAccounts() {
        setSecurityContext(agentId, "agent", false);
        when(accountService.findByAgentID(agentId)).thenReturn(List.of(sampleAccount));

        ResponseEntity<List<Account>> response = accountController.getAccounts(null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    @DisplayName("GET / returns 403 for unknown role")
    void getAccounts_unknownRole_returns403() {
        setSecurityContext(UUID.randomUUID(), "customer", false);

        ResponseEntity<List<Account>> response = accountController.getAccounts(null, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // ---- GET /AllAccounts ----

    @Test
    @DisplayName("GET /AllAccounts returns accounts for admin")
    void getAllAccounts_asAdmin_returnsAll() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(accountService.findAll()).thenReturn(List.of(sampleAccount));

        ResponseEntity<List<Account>> response = accountController.getAllAccounts(null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    @DisplayName("GET /AllAccounts returns 403 for agent")
    void getAllAccounts_asAgent_returns403() {
        setSecurityContext(agentId, "agent", false);

        ResponseEntity<List<Account>> response = accountController.getAllAccounts(null, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(accountService, never()).findAll();
    }

    // ---- GET /AllAccountsByAgent ----

    @Test
    @DisplayName("GET /AllAccountsByAgent returns agent's accounts")
    void getAllAccountsByAgent_asAgent_returnsAccounts() {
        setSecurityContext(agentId, "agent", false);
        when(accountService.findByAgentID(agentId)).thenReturn(List.of(sampleAccount));

        ResponseEntity<List<Account>> response = accountController.getAllAccountsByAgentID(null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    @DisplayName("GET /AllAccountsByAgent returns 403 for admin")
    void getAllAccountsByAgent_asAdmin_returns403() {
        setSecurityContext(UUID.randomUUID(), "admin", false);

        ResponseEntity<List<Account>> response = accountController.getAllAccountsByAgentID(null, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // ---- GET /client/{clientId} ----

    @Test
    @DisplayName("GET /client/{id} returns accounts for admin without client directory lookup")
    void getAccountsByClientId_asAdmin_returnsAccountsDirectly() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(accountService.findByClientId(clientId)).thenReturn(List.of(sampleAccount));

        ResponseEntity<List<Account>> response =
                accountController.getAccountsByClientId(clientId, new MockHttpServletRequest());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(clientDirectoryClient, never()).fetchClient(any(), any());
    }

    @Test
    @DisplayName("GET /client/{id} returns accounts for agent who owns the client")
    void getAccountsByClientId_asAgentOwningClient_returnsAccounts() {
        setSecurityContext(agentId, "agent", false);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token");
        when(clientDirectoryClient.fetchClient(clientId, "Bearer token"))
                .thenReturn(Optional.of(sampleClient));
        when(accountService.findByClientId(clientId)).thenReturn(List.of(sampleAccount));

        ResponseEntity<List<Account>> response =
                accountController.getAccountsByClientId(clientId, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    @DisplayName("GET /client/{id} returns 403 for agent who does not own the client")
    void getAccountsByClientId_asAgentNotOwningClient_returns403() {
        UUID otherAgentId = UUID.randomUUID();
        setSecurityContext(otherAgentId, "agent", false);
        sampleClient.setAssignedAgentId(agentId); // client belongs to a different agent
        when(clientDirectoryClient.fetchClient(eq(clientId), any()))
                .thenReturn(Optional.of(sampleClient));

        ResponseEntity<List<Account>> response =
                accountController.getAccountsByClientId(clientId, new MockHttpServletRequest());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("GET /client/{id} returns 403 when client not found in directory")
    void getAccountsByClientId_clientNotFound_returns403() {
        setSecurityContext(agentId, "agent", false);
        when(clientDirectoryClient.fetchClient(eq(clientId), any())).thenReturn(Optional.empty());

        ResponseEntity<List<Account>> response =
                accountController.getAccountsByClientId(clientId, new MockHttpServletRequest());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // ---- GET /{accountId} ----

    @Test
    @DisplayName("GET /{id} returns account for admin")
    void getAccountById_asAdmin_returnsAccount() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(accountService.findById(accountId)).thenReturn(sampleAccount);

        ResponseEntity<Account> response =
                accountController.getAccountById(accountId, new MockHttpServletRequest());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(accountId, response.getBody().getAccountId());
    }

    @Test
    @DisplayName("GET /{id} returns account for agent who owns the client")
    void getAccountById_asAgentOwningClient_returnsAccount() {
        setSecurityContext(agentId, "agent", false);
        when(accountService.findById(accountId)).thenReturn(sampleAccount);
        when(clientDirectoryClient.fetchClient(eq(clientId), any()))
                .thenReturn(Optional.of(sampleClient));

        ResponseEntity<Account> response =
                accountController.getAccountById(accountId, new MockHttpServletRequest());

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    @DisplayName("GET /{id} returns 403 for agent who does not own the client")
    void getAccountById_asAgentNotOwningClient_returns403() {
        UUID otherAgentId = UUID.randomUUID();
        setSecurityContext(otherAgentId, "agent", false);
        when(accountService.findById(accountId)).thenReturn(sampleAccount);
        sampleClient.setAssignedAgentId(agentId); // owned by different agent
        when(clientDirectoryClient.fetchClient(eq(clientId), any()))
                .thenReturn(Optional.of(sampleClient));

        ResponseEntity<Account> response =
                accountController.getAccountById(accountId, new MockHttpServletRequest());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // ---- POST /{agentId} ----

    @Test
    @DisplayName("POST /{agentId} returns 403 when agent ID in path does not match principal")
    void createAccount_agentIdMismatch_returns403() {
        setSecurityContext(UUID.randomUUID(), "agent", false);

        ResponseEntity<Account> response =
                accountController.createAccount(buildValidRequest(), agentId, new MockHttpServletRequest());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(accountService, never()).createAccount(any(), any(), any());
    }

    @Test
    @DisplayName("POST /{agentId} returns 403 when client is not assigned to the agent")
    void createAccount_clientNotOwnedByAgent_returns403() {
        setSecurityContext(agentId, "agent", false);
        ClientRecord otherClient = new ClientRecord();
        otherClient.setAssignedAgentId(UUID.randomUUID());
        when(clientDirectoryClient.fetchClient(eq(clientId), any()))
                .thenReturn(Optional.of(otherClient));

        ResponseEntity<Account> response =
                accountController.createAccount(buildValidRequest(), agentId, new MockHttpServletRequest());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("POST /{agentId} returns 403 when client not found in directory")
    void createAccount_clientNotFound_returns403() {
        setSecurityContext(agentId, "agent", false);
        when(clientDirectoryClient.fetchClient(eq(clientId), any())).thenReturn(Optional.empty());

        ResponseEntity<Account> response =
                accountController.createAccount(buildValidRequest(), agentId, new MockHttpServletRequest());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("POST /{agentId} returns 201 when agent owns the client")
    void createAccount_validAgentOwnsClient_returns201() {
        setSecurityContext(agentId, "agent", false);
        when(clientDirectoryClient.fetchClient(eq(clientId), any()))
                .thenReturn(Optional.of(sampleClient));
        when(accountService.createAccount(any(Account.class), eq(agentId), eq(sampleClient)))
                .thenReturn(sampleAccount);

        ResponseEntity<Account> response =
                accountController.createAccount(buildValidRequest(), agentId, new MockHttpServletRequest());

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(accountId, response.getBody().getAccountId());
    }

    // ---- POST / (createAccountForAgent) ----

    @Test
    @DisplayName("POST / returns 403 for admin role")
    void createAccountForAgent_asAdmin_returns403() {
        setSecurityContext(UUID.randomUUID(), "admin", false);

        ResponseEntity<Account> response =
                accountController.createAccountForAgent(buildValidRequest(), new MockHttpServletRequest());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // ---- DELETE /DeleteByAccountId/{accountId} ----

    @Test
    @DisplayName("DELETE /DeleteByAccountId returns 403 for admin")
    void deleteAccount_asAdmin_returns403() {
        setSecurityContext(UUID.randomUUID(), "admin", false);

        ResponseEntity<Void> response =
                accountController.deleteAccount(accountId, new MockHttpServletRequest());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(accountService, never()).deleteAccount(any(), any(), any());
    }

    @Test
    @DisplayName("DELETE /DeleteByAccountId returns 403 when agent does not own the client")
    void deleteAccount_agentNotOwningClient_returns403() {
        UUID otherAgentId = UUID.randomUUID();
        setSecurityContext(otherAgentId, "agent", false);
        when(accountService.findById(accountId)).thenReturn(sampleAccount);
        sampleClient.setAssignedAgentId(agentId); // belongs to different agent
        when(clientDirectoryClient.fetchClient(eq(clientId), any()))
                .thenReturn(Optional.of(sampleClient));

        ResponseEntity<Void> response =
                accountController.deleteAccount(accountId, new MockHttpServletRequest());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("DELETE /DeleteByAccountId returns 204 when agent owns the client")
    void deleteAccount_agentOwnsClient_returns204() {
        setSecurityContext(agentId, "agent", false);
        when(accountService.findById(accountId)).thenReturn(sampleAccount);
        when(clientDirectoryClient.fetchClient(eq(clientId), any()))
                .thenReturn(Optional.of(sampleClient));
        doNothing().when(accountService).deleteAccount(accountId, agentId, sampleClient);

        ResponseEntity<Void> response =
                accountController.deleteAccount(accountId, new MockHttpServletRequest());

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(accountService).deleteAccount(accountId, agentId, sampleClient);
    }

    // ---- DELETE /DeleteByClientId/{clientId} ----

    @Test
    @DisplayName("DELETE /DeleteByClientId uses X-Actor-Id header as actorId")
    void deleteAllAccountByClientId_withActorHeader_usesHeaderActorId() {
        UUID actorId = UUID.randomUUID();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Actor-Id", actorId.toString());
        request.addHeader("X-Internal-Key", "secret");
        doNothing().when(accountService).deleteAccountByClientId(clientId, actorId);

        ResponseEntity<Void> response = accountController.deleteAllAccountByClientId(clientId, request);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(accountService).deleteAccountByClientId(clientId, actorId);
    }

    @Test
    @DisplayName("DELETE /DeleteByClientId falls back to clientId when X-Actor-Id header is absent")
    void deleteAllAccountByClientId_noActorHeader_usesClientIdAsActor() {
        doNothing().when(accountService).deleteAccountByClientId(clientId, clientId);

        ResponseEntity<Void> response =
                accountController.deleteAllAccountByClientId(clientId, new MockHttpServletRequest());

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(accountService).deleteAccountByClientId(clientId, clientId);
    }

    // ---- Pagination ----

    @Test
    @DisplayName("GET / with page=0 size=1 returns only the first account")
    void getAccounts_withPagination_returnsFirstPage() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        Account second = new Account();
        second.setAccountId(UUID.randomUUID());
        when(accountService.findAll()).thenReturn(List.of(sampleAccount, second));

        ResponseEntity<List<Account>> response = accountController.getAccounts(0, 1);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        assertEquals(accountId, response.getBody().get(0).getAccountId());
    }

    @Test
    @DisplayName("GET / with page beyond range returns empty list")
    void getAccounts_pageOutOfRange_returnsEmpty() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(accountService.findAll()).thenReturn(List.of(sampleAccount));

        ResponseEntity<List<Account>> response = accountController.getAccounts(10, 10);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isEmpty());
    }

    @Test
    @DisplayName("GET / with only size param returns all accounts (no page offset)")
    void getAccounts_onlySizeParam_returnsFromFirstPage() {
        setSecurityContext(UUID.randomUUID(), "admin", false);
        when(accountService.findAll()).thenReturn(List.of(sampleAccount));

        ResponseEntity<List<Account>> response = accountController.getAccounts(null, 10);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    // ---- Health check ----

    @Test
    @DisplayName("GET /health returns 200 with 'Service is UP'")
    void healthCheck_returns200() {
        ResponseEntity<String> response = accountController.healthCheck();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Service is UP", response.getBody());
    }

    // ---- Helper ----

    private AccountCreateRequest buildValidRequest() {
        AccountCreateRequest req = new AccountCreateRequest();
        req.setClientId(clientId);
        req.setAccountType("Checking");
        req.setAccountStatus("Active");
        req.setOpeningDate(LocalDate.now());
        req.setBalance(BigDecimal.valueOf(500));
        req.setCurrency("SGD");
        req.setBranchId(UUID.randomUUID());
        return req;
    }
}
