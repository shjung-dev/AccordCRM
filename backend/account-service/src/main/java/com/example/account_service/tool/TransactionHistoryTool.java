package com.example.account_service.tool;

import com.example.account_service.model.Transaction;
import com.example.account_service.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class TransactionHistoryTool implements ChatTool {

    private final TransactionRepository transactionRepository;

    private static final int DEFAULT_LIMIT = 15;

    @Override
    public String name() {
        return "transaction_history";
    }

    @Override
    public String description() {
        return "Fetches the most recent transactions for a client by client UUID. Returns up to 15 transactions with type, amount, status, and date.";
    }

    @Override
    public String execute(String params) {
        UUID clientId;
        try {
            clientId = UUID.fromString(params.trim());
        } catch (IllegalArgumentException e) {
            return "Error: Invalid client ID format. Please provide a valid UUID.";
        }

        Page<Transaction> page = transactionRepository.findByClientIdOrderByCreatedAtDesc(
                clientId, PageRequest.of(0, DEFAULT_LIMIT));

        if (page.isEmpty()) {
            return "No transactions found for client " + clientId;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Recent transactions for client ").append(clientId)
                .append(" (showing ").append(page.getNumberOfElements())
                .append(" of ").append(page.getTotalElements()).append(" total):\n\n");

        for (Transaction t : page.getContent()) {
            sb.append("  - ").append(t.getTransactionType())
                    .append(" | ").append(t.getCurrency()).append(" ").append(t.getAmount())
                    .append(" | Status: ").append(t.getStatus());
            if (t.getDescription() != null && !t.getDescription().isBlank()) {
                sb.append(" | ").append(t.getDescription());
            }
            if ("FAILED".equalsIgnoreCase(t.getStatus()) && t.getFailureReason() != null) {
                sb.append(" | Reason: ").append(t.getFailureReason());
            }
            sb.append(" | ").append(t.getCreatedAt()).append("\n");
        }

        return sb.toString();
    }
}
