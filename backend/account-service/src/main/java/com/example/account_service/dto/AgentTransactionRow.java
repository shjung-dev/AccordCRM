package com.example.account_service.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AgentTransactionRow(
        UUID transactionId,
        UUID clientId,
        UUID accountId,
        String transactionType,
        String accountType,
        String accountStatus,
        String currency,
        BigDecimal amount,
        String transactionStatus,
        Instant createdAt
) {
}
