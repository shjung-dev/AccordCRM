package com.example.account_service.controller;

import com.example.account_service.dto.AgentTransactionResponse;
import com.example.account_service.dto.PagedResponse;
import com.example.account_service.model.Account;
import com.example.account_service.model.Transaction;
import com.example.account_service.repository.AccountRepository;
import com.example.account_service.security.AuthPrincipal;
import com.example.account_service.security.AuthUtil;
import com.example.account_service.service.TransactionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final AccountRepository accountRepository;

    public TransactionController(
            TransactionService transactionService,
            AccountRepository accountRepository
    ) {
        this.transactionService = transactionService;
        this.accountRepository = accountRepository;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<AgentTransactionResponse>> getAllTransactions(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            HttpServletRequest request
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();

        if (!principal.isAgent() || principal.getUserId() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Pageable pageable = resolvePageable(page, size);
        String authHeader = request.getHeader("Authorization");
        Page<AgentTransactionResponse> result = transactionService.findAgentTransactions(
                principal.getUserId(),
                authHeader,
                pageable
        );
        return ResponseEntity.ok(toPagedResponse(result, pageable));
    }

    @GetMapping("/{transactionId}")
    public ResponseEntity<Transaction> getTransactionById(
            @PathVariable UUID transactionId
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();

        if (principal.isRootAdmin() || principal.isAdmin()) {
            return transactionService.findById(transactionId)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }

        if (principal.isAgent()) {
            return transactionService.findById(transactionId)
                    .map(txn -> {
                        Set<UUID> ownAccountIds = Set.copyOf(getAgentAccountIds(principal.getUserId()));
                        if (!ownAccountIds.contains(txn.getAccountId())) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).<Transaction>build();
                        }
                        return ResponseEntity.ok(txn);
                    })
                    .orElse(ResponseEntity.notFound().build());
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @GetMapping("/client/{clientId}")
    public ResponseEntity<PagedResponse<Transaction>> getTransactionsByClientId(
            @PathVariable UUID clientId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        Pageable pageable = resolvePageable(page, size);

        if (principal.isRootAdmin() || principal.isAdmin()) {
            Page<Transaction> result = transactionService.findByClientId(clientId, pageable);
            return ResponseEntity.ok(toPagedResponse(result, pageable));
        }

        if (principal.isAgent()) {
            // Verify the agent owns at least one account for this client
            boolean ownsClient = accountRepository.findAllByClientId(clientId).stream()
                    .anyMatch(a -> principal.getUserId().equals(a.getAssignedAgentId()));
            if (!ownsClient) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            Page<Transaction> result = transactionService.findByClientId(clientId, pageable);
            return ResponseEntity.ok(toPagedResponse(result, pageable));
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @GetMapping("/account/{accountId}")
    public ResponseEntity<PagedResponse<Transaction>> getTransactionsByAccountId(
            @PathVariable UUID accountId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        AuthPrincipal principal = AuthUtil.requirePrincipal();
        Pageable pageable = resolvePageable(page, size);

        if (principal.isRootAdmin() || principal.isAdmin()) {
            Page<Transaction> result = transactionService.findByAccountId(accountId, pageable);
            return ResponseEntity.ok(toPagedResponse(result, pageable));
        }

        if (principal.isAgent()) {
            Account account = accountRepository.findById(accountId).orElse(null);
            if (account == null || !principal.getUserId().equals(account.getAssignedAgentId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            Page<Transaction> result = transactionService.findByAccountId(accountId, pageable);
            return ResponseEntity.ok(toPagedResponse(result, pageable));
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    private List<UUID> getAgentAccountIds(UUID agentId) {
        return accountRepository.findByAssignedAgentId(agentId)
                .stream()
                .map(Account::getAccountId)
                .collect(Collectors.toList());
    }

    private static final int MAX_PAGE_SIZE = 100;

    private Pageable resolvePageable(Integer page, Integer size) {
        int resolvedPage = page == null ? 0 : Math.max(page, 0);
        int resolvedSize = Math.min(size == null ? 50 : Math.max(size, 1), MAX_PAGE_SIZE);
        return PageRequest.of(resolvedPage, resolvedSize);
    }

    private <T> PagedResponse<T> toPagedResponse(Page<T> springPage, Pageable pageable) {
        return new PagedResponse<>(
                springPage.getContent(),
                pageable.getPageNumber(),
                pageable.getPageSize(),
                springPage.getTotalElements(),
                springPage.getTotalPages()
        );
    }
}
