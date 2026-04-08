package com.example.account_service.tool;

import com.example.account_service.model.Account;
import com.example.account_service.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ClientPortfolioTool implements ChatTool {

    private final AccountRepository accountRepository;

    @Override
    public String name() {
        return "client_portfolio";
    }

    @Override
    public String description() {
        return "Fetches all accounts for a client by client UUID. Shows account types, statuses, balances, and currencies.";
    }

    @Override
    public String execute(String params) {
        UUID clientId;
        try {
            clientId = UUID.fromString(params.trim());
        } catch (IllegalArgumentException e) {
            return "Error: Invalid client ID format. Please provide a valid UUID.";
        }

        List<Account> accounts = accountRepository.findAllByClientId(clientId);
        if (accounts.isEmpty()) {
            return "No accounts found for client " + clientId;
        }

        BigDecimal totalBalance = accounts.stream()
                .map(Account::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long activeCount = accounts.stream()
                .filter(a -> "Active".equalsIgnoreCase(a.getAccountStatus()))
                .count();

        StringBuilder sb = new StringBuilder();
        sb.append("Client ").append(clientId).append(" — ").append(accounts.size())
                .append(" account(s), ").append(activeCount).append(" active\n\n");

        for (Account a : accounts) {
            sb.append("  - ").append(a.getAccountType())
                    .append(" | Status: ").append(a.getAccountStatus())
                    .append(" | Balance: ").append(a.getCurrency()).append(" ").append(a.getBalance())
                    .append(" | Opened: ").append(a.getOpeningDate())
                    .append("\n");
        }

        sb.append("\nTotal balance across all accounts: ").append(totalBalance);
        return sb.toString();
    }
}
