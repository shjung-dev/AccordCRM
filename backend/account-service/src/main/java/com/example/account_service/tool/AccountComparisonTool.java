package com.example.account_service.tool;

import com.example.account_service.model.Transaction;
import com.example.account_service.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class AccountComparisonTool implements ChatTool {

    private final TransactionRepository transactionRepository;

    @Override
    public String name() {
        return "account_comparison";
    }

    @Override
    public String description() {
        return "Compares a client's transaction activity over the last 30 days vs the previous 30 days by client UUID. Shows volume, deposits, withdrawals, and trends.";
    }

    @Override
    public String execute(String params) {
        UUID clientId;
        try {
            clientId = UUID.fromString(params.trim());
        } catch (IllegalArgumentException e) {
            return "Error: Invalid client ID format. Please provide a valid UUID.";
        }

        List<Transaction> allTxns = transactionRepository.findByClientId(clientId);
        if (allTxns.isEmpty()) {
            return "No transactions found for client " + clientId;
        }

        Instant now = Instant.now();
        Instant thirtyDaysAgo = now.minus(30, ChronoUnit.DAYS);
        Instant sixtyDaysAgo = now.minus(60, ChronoUnit.DAYS);

        List<Transaction> last30 = allTxns.stream()
                .filter(t -> t.getCreatedAt().isAfter(thirtyDaysAgo))
                .toList();
        List<Transaction> prev30 = allTxns.stream()
                .filter(t -> t.getCreatedAt().isAfter(sixtyDaysAgo) && t.getCreatedAt().isBefore(thirtyDaysAgo))
                .toList();

        BigDecimal depositsLast = sumByType(last30, "DEPOSIT");
        BigDecimal depositsPrev = sumByType(prev30, "DEPOSIT");
        BigDecimal withdrawalsLast = sumByType(last30, "WITHDRAWAL");
        BigDecimal withdrawalsPrev = sumByType(prev30, "WITHDRAWAL");

        long failedLast = last30.stream().filter(t -> "FAILED".equalsIgnoreCase(t.getStatus())).count();
        long failedPrev = prev30.stream().filter(t -> "FAILED".equalsIgnoreCase(t.getStatus())).count();

        Map<String, Long> typesLast = last30.stream()
                .collect(Collectors.groupingBy(Transaction::getTransactionType, Collectors.counting()));
        Map<String, Long> typesPrev = prev30.stream()
                .collect(Collectors.groupingBy(Transaction::getTransactionType, Collectors.counting()));

        String volumeChange = percentChange(prev30.size(), last30.size());

        StringBuilder sb = new StringBuilder();
        sb.append("Activity comparison for client ").append(clientId).append(":\n\n");

        sb.append("                    Last 30 days    Previous 30 days    Change\n");
        sb.append("  Transactions:     ").append(padRight(last30.size(), 16))
                .append(padRight(prev30.size(), 20)).append(volumeChange).append("\n");
        sb.append("  Deposits:         ").append(padRight(depositsLast, 16))
                .append(padRight(depositsPrev, 20))
                .append(percentChange(depositsPrev, depositsLast)).append("\n");
        sb.append("  Withdrawals:      ").append(padRight(withdrawalsLast, 16))
                .append(padRight(withdrawalsPrev, 20))
                .append(percentChange(withdrawalsPrev, withdrawalsLast)).append("\n");
        sb.append("  Failed:           ").append(padRight(failedLast, 16))
                .append(padRight(failedPrev, 20)).append("\n");

        sb.append("\n  Transaction types (last 30d): ").append(typesLast);
        sb.append("\n  Transaction types (prev 30d): ").append(typesPrev);

        return sb.toString();
    }

    private BigDecimal sumByType(List<Transaction> txns, String type) {
        return txns.stream()
                .filter(t -> type.equalsIgnoreCase(t.getTransactionType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String percentChange(long prev, long current) {
        if (prev == 0) return current > 0 ? "+100%" : "0%";
        double pct = ((current - prev) * 100.0) / prev;
        return String.format("%+.0f%%", pct);
    }

    private String percentChange(BigDecimal prev, BigDecimal current) {
        if (prev.compareTo(BigDecimal.ZERO) == 0) {
            return current.compareTo(BigDecimal.ZERO) > 0 ? "+100%" : "0%";
        }
        BigDecimal pct = current.subtract(prev)
                .multiply(BigDecimal.valueOf(100))
                .divide(prev, 0, RoundingMode.HALF_UP);
        return (pct.signum() > 0 ? "+" : "") + pct + "%";
    }

    private String padRight(Object value, int width) {
        String s = String.valueOf(value);
        return s + " ".repeat(Math.max(0, width - s.length()));
    }
}
