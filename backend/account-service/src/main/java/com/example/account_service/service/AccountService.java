package com.example.account_service.service;

import com.example.account_service.integration.ClientRecord;
import com.example.account_service.repository.AccountRepository;
import com.example.account_service.repository.TransactionRepository;
import com.example.account_service.model.Account;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;
import java.time.Instant;

@Service
public class AccountService {

    private static final Logger log = LoggerFactory.getLogger(AccountService.class);

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final SqsEmailPublisher sqsEmailPublisher;
    private final SqsLogPublisher sqsLogPublisher;

    public AccountService(AccountRepository accountRepository,
            TransactionRepository transactionRepository,
            SqsEmailPublisher sqsEmailPublisher,
            SqsLogPublisher sqsLogPublisher) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.sqsEmailPublisher = sqsEmailPublisher;
        this.sqsLogPublisher = sqsLogPublisher;
    }

    public List<Account> findAll() {
        return accountRepository.findAll();
    }

    @Cacheable(value = "accounts-by-id", cacheManager = "accountTransactionCacheManager",
               key = "#id.toString()")
    public Account findById(UUID id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found with ID: " + id));
    }

    public List<Account> findByAgentID(UUID agent_id) {
        return accountRepository.findByAssignedAgentId(agent_id);
    }

    @Cacheable(value = "accounts-by-client", cacheManager = "accountTransactionCacheManager",
               key = "#clientId.toString()")
    public List<Account> findByClientId(UUID clientId) {
        return accountRepository.findAllByClientId(clientId);
    }

    @Caching(evict = {
        @CacheEvict(value = "accounts-by-id",     cacheManager = "accountTransactionCacheManager", allEntries = true),
        @CacheEvict(value = "accounts-by-client", cacheManager = "accountTransactionCacheManager", allEntries = true)
    })
    @Transactional
    public Account createAccount(Account account, UUID agentId, ClientRecord client) {
        try {
            account.setCreatedAt(Instant.now());

            Account saved = accountRepository.save(account);
            String creationReason = client != null
                    ? "Created new Bank Account for client: " + client.getFirstName() + " " + client.getLastName()
                    : "Created new Bank Account";
            if (client != null && client.getEmailAddress() != null && !client.getEmailAddress().isBlank()) {
                sqsEmailPublisher.publishAccountCreated(
                        client.getEmailAddress(),
                        client.getFirstName(),
                        client.getLastName(),
                        saved
                );
            }
            sqsLogPublisher.publish(agentId, "ACCOUNT_CREATED", "ACCOUNT", saved.getAccountId(), creationReason);
            return saved;
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Failed to create account: constraint violation", e);
        }
    }

    @Caching(evict = {
        @CacheEvict(value = "accounts-by-id",     cacheManager = "accountTransactionCacheManager", allEntries = true),
        @CacheEvict(value = "accounts-by-client", cacheManager = "accountTransactionCacheManager", allEntries = true)
    })
    @Transactional
    public void deleteAccount(UUID id, UUID actorId, ClientRecord client) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        if (!"Inactive".equalsIgnoreCase(account.getAccountStatus())) {
            account.setAccountStatus("Inactive");
            accountRepository.save(account);
            String deletionReason = client != null
                    ? "Deleted Bank Account for client: " + client.getFirstName() + " " + client.getLastName()
                    : "Deleted Bank Account";
            if (client != null && client.getEmailAddress() != null && !client.getEmailAddress().isBlank()) {
                sqsEmailPublisher.publishAccountDeleted(
                        client.getEmailAddress(),
                        client.getFirstName(),
                        client.getLastName(),
                        account
                );
            }
            sqsLogPublisher.publish(actorId, "ACCOUNT_DELETED", "ACCOUNT", id, deletionReason);
        }
    }

    @Caching(evict = {
        @CacheEvict(value = "accounts-by-id",     cacheManager = "accountTransactionCacheManager", allEntries = true),
        @CacheEvict(value = "accounts-by-client", cacheManager = "accountTransactionCacheManager", allEntries = true)
    })
    @Transactional
    public void deleteAccountByClientId(UUID clientId, UUID actorId) {
        log.info("deleteAccountByClientId — clientId={} actorId={}", clientId, actorId);
        List<Account> accounts = accountRepository.findAllByClientId(clientId);
        log.info("deleteAccountByClientId — found {} accounts for clientId={}", accounts.size(), clientId);
        accounts.stream()
                .filter(account -> !"Inactive".equalsIgnoreCase(account.getAccountStatus()))
                .forEach(account -> {
                    account.setAccountStatus("Inactive");
                    sqsLogPublisher.publish(actorId, "ACCOUNT_DELETED", "ACCOUNT", account.getAccountId(), "Deleted account for removed client");
                });
        accountRepository.saveAll(accounts);
        log.info("deleteAccountByClientId — accounts saved, now deleting transactions for clientId={}", clientId);
        transactionRepository.deleteByClientId(clientId);
        log.info("deleteAccountByClientId — transactions deleted for clientId={}", clientId);
        sqsLogPublisher.publish(actorId, "TRANSACTIONS_DELETED", "CLIENT", clientId, "Deleted all transactions for removed client");
        log.info("deleteAccountByClientId — completed for clientId={}", clientId);
    }
}
