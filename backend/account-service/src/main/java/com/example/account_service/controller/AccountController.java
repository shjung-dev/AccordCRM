package com.example.account_service.controller;

import com.example.account_service.model.Account;
import com.example.account_service.dto.AccountCreateRequest;
import com.example.account_service.integration.ClientDirectoryClient;
import com.example.account_service.integration.ClientRecord;
import com.example.account_service.security.AuthPrincipal;
import com.example.account_service.security.AuthUtil;
import com.example.account_service.service.AccountService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.UUID;


@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private static final Logger log = LoggerFactory.getLogger(AccountController.class);

    private final AccountService accountService;
    private final ClientDirectoryClient clientDirectoryClient;

    public AccountController(
            AccountService accountService,
            ClientDirectoryClient clientDirectoryClient
    ) {
        this.accountService = accountService;
        this.clientDirectoryClient = clientDirectoryClient;
    }

    // Role-aware: admin/rootAdmin see all accounts, agent sees only their own
    @GetMapping
    public ResponseEntity<List<Account>> getAccounts(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (principal.isRootAdmin() || principal.isAdmin()) {
            List<Account> accounts = accountService.findAll();
            return ResponseEntity.ok(paginate(accounts, page, size));
        }
        if (principal.isAgent()) {
            List<Account> accounts = accountService.findByAgentID(principal.getUserId());
            return ResponseEntity.ok(paginate(accounts, page, size));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    //Retrieve All the account records of clients for Admin to see
    @GetMapping("/AllAccounts")
    public ResponseEntity<List<Account>> getAllAccounts(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isRootAdmin() && !principal.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<Account> accounts = accountService.findAll();
        return ResponseEntity.ok(paginate(accounts, page, size));
    }

    // Retrieves all accounts linked to the authenticated agent and pagination
    @GetMapping("/AllAccountsByAgent")
    public ResponseEntity<List<Account>> getAllAccountsByAgentID(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isAgent()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<Account> accounts = accountService.findByAgentID(principal.getUserId());

        return ResponseEntity.ok(paginate(accounts, page, size));
    }

    // Retrieves all accounts for a specific client
    @GetMapping("/client/{clientId}")
    public ResponseEntity<List<Account>> getAccountsByClientId(
            @PathVariable UUID clientId,
            HttpServletRequest request
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (principal.isRootAdmin() || principal.isAdmin()) {
            return ResponseEntity.ok(accountService.findByClientId(clientId));
        }
        if (principal.isAgent()) {
            String authHeader = request.getHeader("Authorization");
            ClientRecord client = clientDirectoryClient
                    .fetchClient(clientId, authHeader)
                    .orElse(null);
            if (client == null || !principal.getUserId().equals(client.getAssignedAgentId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            return ResponseEntity.ok(accountService.findByClientId(clientId));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    // Retrieves a specific account by ID
    @GetMapping("/{accountId}")
    public ResponseEntity<Account> getAccountById(@PathVariable UUID accountId, HttpServletRequest request) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (principal.isRootAdmin() || principal.isAdmin()) {
            return ResponseEntity.ok(accountService.findById(accountId));
        }
        if (principal.isAgent()) {
            Account account = accountService.findById(accountId);
            String authHeader = request.getHeader("Authorization");
            ClientRecord client = clientDirectoryClient
                    .fetchClient(account.getClientId(), authHeader)
                    .orElse(null);
            if (client == null || !principal.getUserId().equals(client.getAssignedAgentId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            return ResponseEntity.ok(account);
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    // Creates a new account for a client by the agent
    @PostMapping("/{agentId}")
    public ResponseEntity<Account> createAccount(
            @Valid @RequestBody AccountCreateRequest requestBody,
            @PathVariable UUID agentId,
            HttpServletRequest request
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isAgent() || !principal.getUserId().equals(agentId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String authHeader = request.getHeader("Authorization");
        ClientRecord client = clientDirectoryClient
                .fetchClient(requestBody.getClientId(), authHeader)
                .orElse(null);
        if (client == null || !principal.getUserId().equals(client.getAssignedAgentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Account newAccount = new Account();
        newAccount.setClientId(requestBody.getClientId());
        newAccount.setAccountType(requestBody.getAccountType());
        newAccount.setAccountStatus(requestBody.getAccountStatus());
        newAccount.setOpeningDate(requestBody.getOpeningDate());
        newAccount.setBalance(requestBody.getBalance());
        newAccount.setCurrency(requestBody.getCurrency());
        newAccount.setBranchId(requestBody.getBranchId());
        newAccount.setVerificationStatus(requestBody.getVerificationStatus());
        newAccount.setAssignedAgentId(agentId);

        Account savedAccount = accountService.createAccount(newAccount, agentId, client);
        return new ResponseEntity<>(savedAccount, HttpStatus.CREATED);
    }

    // Wrapper function for creating accounts for clients by agent
    @PostMapping
    public ResponseEntity<Account> createAccountForAgent(
            @Valid @RequestBody AccountCreateRequest requestBody,
            HttpServletRequest request
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isAgent()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return createAccount(requestBody, principal.getUserId(), request);
    }

    // Deletes an account by the account ID (agent must own the client)
    @DeleteMapping("/DeleteByAccountId/{accountId}")
    public ResponseEntity<Void> deleteAccount(@PathVariable UUID accountId, HttpServletRequest request) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isAgent()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Account account = accountService.findById(accountId);
        String authHeader = request.getHeader("Authorization");
        ClientRecord client = clientDirectoryClient
                .fetchClient(account.getClientId(), authHeader)
                .orElse(null);
        if (client == null || !principal.getUserId().equals(client.getAssignedAgentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        accountService.deleteAccount(accountId, principal.getUserId(), client);
        return ResponseEntity.noContent().build();
    }

    //Delete all the accounts by client ID -> This is invoked when we delete the client, we need to delete all the
    //account records that are tied to that deleted client
    @DeleteMapping("/DeleteByClientId/{clientId}")
    public ResponseEntity<Void> deleteAllAccountByClientId(@PathVariable UUID clientId, HttpServletRequest request){
        log.info("DELETE /api/accounts/DeleteByClientId/{} hit", clientId);
        String actorHeader = request.getHeader("X-Actor-Id");
        String internalKeyHeader = request.getHeader("X-Internal-Key");
        log.info("DELETE /api/accounts/DeleteByClientId/{} — X-Actor-Id={} X-Internal-Key-present={}",
                clientId, actorHeader, internalKeyHeader != null);
        UUID actorId = actorHeader != null ? UUID.fromString(actorHeader) : clientId;
        log.info("DELETE /api/accounts/DeleteByClientId/{} — resolved actorId={}", clientId, actorId);
        try {
            accountService.deleteAccountByClientId(clientId, actorId);
            log.info("DELETE /api/accounts/DeleteByClientId/{} — completed successfully", clientId);
        } catch (Exception e) {
            log.error("DELETE /api/accounts/DeleteByClientId/{} — failed: {}", clientId, e.getMessage(), e);
            throw e;
        }
        return ResponseEntity.noContent().build();
    }

    // Paginates a list of accounts based on page number and size parameters
    private List<Account> paginate(List<Account> accounts, Integer page, Integer size) {
        if (page == null && size == null) {
            return accounts;
        }
        int resolvedPage = page == null ? 0 : Math.max(page, 0);
        int resolvedSize = size == null ? 50 : Math.max(size, 1);
        int fromIndex = resolvedPage * resolvedSize;
        if (fromIndex >= accounts.size()) {
            return List.of();
        }
        int toIndex = Math.min(fromIndex + resolvedSize, accounts.size());
        return accounts.subList(fromIndex, toIndex);
    }

    // Standard Health Check for ALB/ECS
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        // You can add logic here to check if the DB is connected if needed
        return ResponseEntity.ok("Service is UP");
    }
}
