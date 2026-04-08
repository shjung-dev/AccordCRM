package com.example.account_service.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AgentTransactionResponse(
        UUID transactionId,
        UUID clientId,
        UUID accountId,
        String transactionType,
        String clientFirstName,
        String clientLastName,
        String accountType,
        String accountStatus,
        String currency,
        BigDecimal amount,
        String status,
        Instant createdAt
) {
}
