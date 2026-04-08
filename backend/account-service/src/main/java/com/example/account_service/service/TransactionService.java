package com.example.account_service.service;

import com.example.account_service.dto.AgentTransactionResponse;
import com.example.account_service.dto.AgentTransactionRow;
import com.example.account_service.integration.ClientDirectoryClient;
import com.example.account_service.integration.ClientRecord;
import com.example.account_service.model.Transaction;
import com.example.account_service.repository.TransactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final ClientDirectoryClient clientDirectoryClient;

    public TransactionService(
            TransactionRepository transactionRepository,
            ClientDirectoryClient clientDirectoryClient
    ) {
        this.transactionRepository = transactionRepository;
        this.clientDirectoryClient = clientDirectoryClient;
    }

    public Optional<Transaction> findById(UUID id) {
        return transactionRepository.findById(id);
    }

    public Page<Transaction> findAll(Pageable pageable) {
        return transactionRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Page<Transaction> findByAccountIds(List<UUID> accountIds, Pageable pageable) {
        return transactionRepository.findByAccountIdInOrderByCreatedAtDesc(accountIds, pageable);
    }

    public Page<Transaction> findByClientId(UUID clientId, Pageable pageable) {
        return transactionRepository.findByClientIdOrderByCreatedAtDesc(clientId, pageable);
    }

    public Page<Transaction> findByAccountId(UUID accountId, Pageable pageable) {
        return transactionRepository.findByAccountIdOrderByCreatedAtDesc(accountId, pageable);
    }

    public Page<AgentTransactionResponse> findAgentTransactions(
            UUID agentId,
            String authHeader,
            Pageable pageable
    ) {
        Page<AgentTransactionRow> rowsPage = transactionRepository.findAgentTransactionRows(agentId, pageable);
        Map<UUID, Optional<ClientRecord>> clientCache = new HashMap<>();

        List<AgentTransactionResponse> responses = rowsPage.getContent().stream()
                .map(row -> {
                    Optional<ClientRecord> clientOpt = clientCache.computeIfAbsent(
                            row.clientId(),
                            id -> clientDirectoryClient.fetchClient(id, authHeader)
                    );

                    String firstName = clientOpt.map(ClientRecord::getFirstName).orElse("");
                    String lastName = clientOpt.map(ClientRecord::getLastName).orElse("");

                    return new AgentTransactionResponse(
                            row.transactionId(),
                            row.clientId(),
                            row.accountId(),
                            row.transactionType(),
                            firstName,
                            lastName,
                            row.accountType(),
                            row.accountStatus(),
                            row.currency(),
                            row.amount(),
                            row.transactionStatus(),
                            row.createdAt()
                    );
                })
                .toList();

        return new org.springframework.data.domain.PageImpl<>(
                responses,
                pageable,
                rowsPage.getTotalElements()
        );
    }
}
