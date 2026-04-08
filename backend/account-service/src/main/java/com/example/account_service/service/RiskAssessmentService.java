package com.example.account_service.service;

import com.example.account_service.dto.RiskAssessmentResponse;
import com.example.account_service.model.Account;
import com.example.account_service.model.RiskScoreRecord;
import com.example.account_service.model.Transaction;
import com.example.account_service.repository.AccountRepository;
import com.example.account_service.repository.RiskScoreRepository;
import com.example.account_service.repository.TransactionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RiskAssessmentService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final RiskScoreRepository riskScoreRepository;
    private final BedrockService bedrockService;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT = """
            You are a Client Retention AI Assistant integrated into AccordCRM, a banking CRM system.
            Your role is to analyse a client's banking behaviour and assess their risk of churning (leaving the bank).

            You will receive structured account and transaction data. Based on this, produce a JSON object ONLY — no markdown, no extra text.
            The JSON must follow this exact schema:
            {
              "score": <integer 0-100>,
              "riskLevel": "<LOW|MEDIUM|HIGH>",
              "factors": ["<observed churn signal 1>", "<observed churn signal 2>", ...],
              "retentionStrategies": ["<recommended agent action 1>", "<recommended agent action 2>", ...],
              "summary": "<one sentence describing the client's churn risk>"
            }

            Scoring guide:
              0–39  = LOW   — Client is engaged; no immediate intervention needed.
              40–69 = MEDIUM — Early warning signs; proactive outreach recommended.
              70–100 = HIGH  — Client is likely churning; urgent retention action required.

            Churn signals to evaluate:
              - Declining deposit frequency or amount over the past 30 days vs prior 30 days
              - Reduced overall transaction activity (engagement drop)
              - Large or repeated outward transfers (possible account consolidation elsewhere)
              - High rate of failed transactions (frustration signal)
              - Accounts moving to Inactive or Closed status
              - Long inactivity (days since last transaction)
              - Declining total balance across all accounts

            Retention strategies should be specific, actionable steps an agent can take immediately.
            """;

    /**
     * Assesses churn risk for a client across ALL their accounts and transactions.
     * Cached by clientId for 5 min — fresh Bedrock call on cache miss.
     * Result is persisted to the risk_score DynamoDB table.
     */
    @Cacheable(value = "risk-scores", cacheManager = "aiOutputCacheManager", key = "#clientId.toString()")
    public RiskAssessmentResponse assessChurnRisk(UUID clientId) {
        List<Account> accounts = accountRepository.findAllByClientId(clientId);
        if (accounts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No accounts found for client");
        }

        List<Transaction> allTxns = transactionRepository.findByClientId(clientId);

        ChurnMetrics metrics = computeChurnMetrics(accounts, allTxns);
        String userMessage = buildChurnPrompt(clientId, accounts, metrics);
        String rawJson = stripMarkdownCodeFence(bedrockService.invoke(SYSTEM_PROMPT, userMessage));

        try {
            JsonNode node = objectMapper.readTree(rawJson);
            int score = node.path("score").asInt();
            String riskLevel = node.path("riskLevel").asText("MEDIUM");
            List<String> factors = objectMapper.convertValue(
                    node.path("factors"), new TypeReference<>() {});
            List<String> retentionStrategies = objectMapper.convertValue(
                    node.path("retentionStrategies"), new TypeReference<>() {});
            String summary = node.path("summary").asText();
            String assessedAt = Instant.now().toString();

            riskScoreRepository.save(RiskScoreRecord.builder()
                    .riskScoreId(UUID.randomUUID().toString())
                    .clientId(clientId.toString())
                    .score(score)
                    .riskLevel(riskLevel)
                    .factors(objectMapper.writeValueAsString(factors))
                    .retentionStrategies(objectMapper.writeValueAsString(retentionStrategies))
                    .summary(summary)
                    .modelUsed(bedrockService.getModelId())
                    .assessedAt(assessedAt)
                    .build());

            return RiskAssessmentResponse.builder()
                    .clientId(clientId.toString())
                    .score(score)
                    .riskLevel(riskLevel)
                    .factors(factors)
                    .retentionStrategies(retentionStrategies)
                    .summary(summary)
                    .assessedAt(assessedAt)
                    .cacheHit(false)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse Bedrock churn response for client {}: {}", clientId, rawJson, e);
            throw new RuntimeException("Failed to parse churn risk assessment response", e);
        }
    }

    public List<RiskScoreRecord> getHistory(UUID clientId) {
        return riskScoreRepository.findByClientId(clientId.toString());
    }

    private static String stripMarkdownCodeFence(String text) {
        if (text == null) return "";
        String trimmed = text.strip();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            if (firstNewline != -1) {
                trimmed = trimmed.substring(firstNewline + 1);
            }
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3).stripTrailing();
            }
        }
        return trimmed;
    }

    // ── Churn signal computation ─────────────────────────────────────────────

    private ChurnMetrics computeChurnMetrics(List<Account> accounts, List<Transaction> txns) {
        Instant now = Instant.now();
        Instant thirtyDaysAgo = now.minus(30, ChronoUnit.DAYS);
        Instant sixtyDaysAgo = now.minus(60, ChronoUnit.DAYS);

        List<Transaction> last30 = txns.stream()
                .filter(t -> t.getCreatedAt().isAfter(thirtyDaysAgo))
                .toList();
        List<Transaction> prev30 = txns.stream()
                .filter(t -> t.getCreatedAt().isAfter(sixtyDaysAgo) && t.getCreatedAt().isBefore(thirtyDaysAgo))
                .toList();

        BigDecimal depositsLast30 = sumByType(last30, "DEPOSIT");
        BigDecimal depositsPrev30 = sumByType(prev30, "DEPOSIT");

        long failedLast30 = last30.stream().filter(t -> "FAILED".equalsIgnoreCase(t.getStatus())).count();

        BigDecimal largeTransferThreshold = new BigDecimal("10000");
        long largeOutwardTransfers = txns.stream()
                .filter(t -> ("TRANSFER".equalsIgnoreCase(t.getTransactionType())
                        || "WITHDRAWAL".equalsIgnoreCase(t.getTransactionType()))
                        && t.getAmount().compareTo(largeTransferThreshold) > 0)
                .count();

        long inactiveAccounts = accounts.stream()
                .filter(a -> "Inactive".equalsIgnoreCase(a.getAccountStatus())
                        || "Closed".equalsIgnoreCase(a.getAccountStatus()))
                .count();

        BigDecimal totalBalance = accounts.stream()
                .map(Account::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long daysSinceLastTxn = txns.stream()
                .map(Transaction::getCreatedAt)
                .max(Instant::compareTo)
                .map(last -> ChronoUnit.DAYS.between(last, now))
                .orElse(999L);

        Map<String, Long> txnTypeBreakdownLast30 = last30.stream()
                .collect(Collectors.groupingBy(Transaction::getTransactionType, Collectors.counting()));

        return new ChurnMetrics(
                last30.size(), prev30.size(),
                depositsLast30, depositsPrev30,
                failedLast30, largeOutwardTransfers,
                inactiveAccounts, totalBalance, daysSinceLastTxn,
                txnTypeBreakdownLast30
        );
    }

    private BigDecimal sumByType(List<Transaction> txns, String type) {
        return txns.stream()
                .filter(t -> type.equalsIgnoreCase(t.getTransactionType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String buildChurnPrompt(UUID clientId, List<Account> accounts, ChurnMetrics m) {
        String accountSummary = accounts.stream()
                .map(a -> "  - %s | %s | Balance: %s %s | Opened: %s".formatted(
                        a.getAccountType(), a.getAccountStatus(),
                        a.getBalance(), a.getCurrency(), a.getOpeningDate()))
                .collect(Collectors.joining("\n"));

        return """
                Client ID: %s
                Number of accounts: %d

                Account breakdown:
                %s

                Transaction behaviour — last 30 days vs previous 30 days:
                  Transaction count:   %d (last) vs %d (prev)
                  Deposit amount:      %s (last) vs %s (prev)
                  Failed transactions: %d (last 30 days)
                  Large outward transfers (>10,000): %d total
                  Transaction type breakdown (last 30 days): %s

                Portfolio health:
                  Total balance across all accounts: %s
                  Inactive or closed accounts: %d
                  Days since last transaction: %d

                Assess this client's churn risk and provide specific retention strategies.
                """.formatted(
                clientId,
                accounts.size(),
                accountSummary,
                m.txnCountLast30, m.txnCountPrev30,
                m.depositsLast30, m.depositsPrev30,
                m.failedLast30,
                m.largeOutwardTransfers,
                m.txnTypeBreakdown,
                m.totalBalance,
                m.inactiveAccounts,
                m.daysSinceLastTxn
        );
    }

    private record ChurnMetrics(
            int txnCountLast30,
            int txnCountPrev30,
            BigDecimal depositsLast30,
            BigDecimal depositsPrev30,
            long failedLast30,
            long largeOutwardTransfers,
            long inactiveAccounts,
            BigDecimal totalBalance,
            long daysSinceLastTxn,
            Map<String, Long> txnTypeBreakdown
    ) {}
}
