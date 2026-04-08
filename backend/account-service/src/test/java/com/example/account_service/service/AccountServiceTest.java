package com.example.account_service.service;

import com.example.account_service.integration.ClientRecord;
import com.example.account_service.model.Account;
import com.example.account_service.repository.AccountRepository;
import com.example.account_service.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AccountServiceTest {

    @Mock private AccountRepository accountRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private SqsEmailPublisher sqsEmailPublisher;
    @Mock private SqsLogPublisher sqsLogPublisher;

    @InjectMocks
    private AccountService accountService;

    private UUID sampleAccountId;
    private UUID sampleAgentId;
    private UUID sampleClientId;
    private Account sampleAccount;
    private ClientRecord sampleClient;

    @BeforeEach
    void setUp() {
        sampleAccountId = UUID.randomUUID();
        sampleAgentId = UUID.randomUUID();
        sampleClientId = UUID.randomUUID();

        sampleAccount = new Account();
        sampleAccount.setAccountId(sampleAccountId);
        sampleAccount.setClientId(sampleClientId);
        sampleAccount.setAccountType("Checking");
        sampleAccount.setAccountStatus("Active");
        sampleAccount.setOpeningDate(LocalDate.now());
        sampleAccount.setBalance(BigDecimal.valueOf(1000));
        sampleAccount.setCurrency("SGD");
        sampleAccount.setBranchId(UUID.randomUUID());

        sampleClient = new ClientRecord();
        sampleClient.setClientId(sampleClientId);
        sampleClient.setAssignedAgentId(sampleAgentId);
        sampleClient.setFirstName("John");
        sampleClient.setLastName("Doe");
        sampleClient.setEmailAddress("john.doe@example.com");
    }

    // ---- findAll ----

    @Test
    @DisplayName("findAll returns all accounts from repository")
    void findAll_returnsAllAccounts() {
        when(accountRepository.findAll()).thenReturn(List.of(sampleAccount));

        List<Account> result = accountService.findAll();

        assertEquals(1, result.size());
        verify(accountRepository).findAll();
    }

    @Test
    @DisplayName("findAll returns empty list when no accounts exist")
    void findAll_empty_returnsEmptyList() {
        when(accountRepository.findAll()).thenReturn(List.of());

        assertTrue(accountService.findAll().isEmpty());
    }

    // ---- findById ----

    @Test
    @DisplayName("findById returns account when found")
    void findById_found_returnsAccount() {
        when(accountRepository.findById(sampleAccountId)).thenReturn(Optional.of(sampleAccount));

        Account result = accountService.findById(sampleAccountId);

        assertNotNull(result);
        assertEquals(sampleAccountId, result.getAccountId());
    }

    @Test
    @DisplayName("findById throws 404 ResponseStatusException when account not found")
    void findById_notFound_throws404() {
        when(accountRepository.findById(sampleAccountId)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> accountService.findById(sampleAccountId));

        assertEquals(404, ex.getStatusCode().value());
    }

    // ---- findByAgentID ----

    @Test
    @DisplayName("findByAgentID returns accounts assigned to the agent")
    void findByAgentID_returnsAgentAccounts() {
        when(accountRepository.findByAssignedAgentId(sampleAgentId)).thenReturn(List.of(sampleAccount));

        List<Account> result = accountService.findByAgentID(sampleAgentId);

        assertEquals(1, result.size());
        assertEquals(sampleAccountId, result.get(0).getAccountId());
    }

    // ---- findByClientId ----

    @Test
    @DisplayName("findByClientId returns accounts for the given client")
    void findByClientId_returnsClientAccounts() {
        when(accountRepository.findAllByClientId(sampleClientId)).thenReturn(List.of(sampleAccount));

        List<Account> result = accountService.findByClientId(sampleClientId);

        assertEquals(1, result.size());
    }

    // ---- createAccount ----

    @Test
    @DisplayName("createAccount saves account, sends email, and publishes log when client has email")
    void createAccount_withClientEmail_savesAndPublishes() {
        when(accountRepository.save(any(Account.class))).thenReturn(sampleAccount);

        Account result = accountService.createAccount(sampleAccount, sampleAgentId, sampleClient);

        assertNotNull(result);
        verify(accountRepository).save(sampleAccount);
        verify(sqsEmailPublisher).publishAccountCreated(
                eq("john.doe@example.com"), eq("John"), eq("Doe"), eq(sampleAccount));
        verify(sqsLogPublisher).publish(eq(sampleAgentId), eq("ACCOUNT_CREATED"), eq("ACCOUNT"),
                eq(sampleAccount.getAccountId()), anyString());
    }

    @Test
    @DisplayName("createAccount skips email when client is null")
    void createAccount_nullClient_skipsEmail() {
        when(accountRepository.save(any(Account.class))).thenReturn(sampleAccount);

        accountService.createAccount(sampleAccount, sampleAgentId, null);

        verify(sqsEmailPublisher, never()).publishAccountCreated(any(), any(), any(), any());
        verify(sqsLogPublisher).publish(any(), eq("ACCOUNT_CREATED"), eq("ACCOUNT"), any(), anyString());
    }

    @Test
    @DisplayName("createAccount skips email when client email is blank")
    void createAccount_blankEmail_skipsEmail() {
        sampleClient.setEmailAddress("   ");
        when(accountRepository.save(any(Account.class))).thenReturn(sampleAccount);

        accountService.createAccount(sampleAccount, sampleAgentId, sampleClient);

        verify(sqsEmailPublisher, never()).publishAccountCreated(any(), any(), any(), any());
    }

    @Test
    @DisplayName("createAccount throws IllegalArgumentException on constraint violation")
    void createAccount_constraintViolation_throwsIllegalArgument() {
        when(accountRepository.save(any())).thenThrow(
                new org.springframework.dao.DataIntegrityViolationException("constraint"));

        assertThrows(IllegalArgumentException.class,
                () -> accountService.createAccount(sampleAccount, sampleAgentId, sampleClient));
    }

    // ---- deleteAccount ----

    @Test
    @DisplayName("deleteAccount soft-deletes active account, sends email, and publishes log")
    void deleteAccount_activeAccount_softDeletesAndPublishes() {
        when(accountRepository.findById(sampleAccountId)).thenReturn(Optional.of(sampleAccount));
        when(accountRepository.save(any())).thenReturn(sampleAccount);

        accountService.deleteAccount(sampleAccountId, sampleAgentId, sampleClient);

        assertEquals("Inactive", sampleAccount.getAccountStatus());
        verify(accountRepository).save(sampleAccount);
        verify(sqsEmailPublisher).publishAccountDeleted(
                eq("john.doe@example.com"), eq("John"), eq("Doe"), eq(sampleAccount));
        verify(sqsLogPublisher).publish(eq(sampleAgentId), eq("ACCOUNT_DELETED"), eq("ACCOUNT"),
                eq(sampleAccountId), anyString());
    }

    @Test
    @DisplayName("deleteAccount throws 404 when account not found")
    void deleteAccount_notFound_throws404() {
        when(accountRepository.findById(sampleAccountId)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> accountService.deleteAccount(sampleAccountId, sampleAgentId, sampleClient));

        assertEquals(404, ex.getStatusCode().value());
        verify(accountRepository, never()).save(any());
    }

    @Test
    @DisplayName("deleteAccount skips save and email when account already Inactive")
    void deleteAccount_alreadyInactive_skipsAll() {
        sampleAccount.setAccountStatus("Inactive");
        when(accountRepository.findById(sampleAccountId)).thenReturn(Optional.of(sampleAccount));

        accountService.deleteAccount(sampleAccountId, sampleAgentId, sampleClient);

        verify(accountRepository, never()).save(any());
        verify(sqsEmailPublisher, never()).publishAccountDeleted(any(), any(), any(), any());
        verify(sqsLogPublisher, never()).publish(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("deleteAccount skips email but still logs when client is null")
    void deleteAccount_nullClient_skipsEmailStillLogs() {
        when(accountRepository.findById(sampleAccountId)).thenReturn(Optional.of(sampleAccount));
        when(accountRepository.save(any())).thenReturn(sampleAccount);

        accountService.deleteAccount(sampleAccountId, sampleAgentId, null);

        verify(sqsEmailPublisher, never()).publishAccountDeleted(any(), any(), any(), any());
        verify(sqsLogPublisher).publish(any(), eq("ACCOUNT_DELETED"), any(), any(), any());
    }

    // ---- deleteAccountByClientId ----

    @Test
    @DisplayName("deleteAccountByClientId soft-deletes active accounts, skips inactive, and deletes transactions")
    void deleteAccountByClientId_softDeletesActiveAndCascadesTransactions() {
        Account active = new Account();
        active.setAccountId(UUID.randomUUID());
        active.setAccountStatus("Active");

        Account inactive = new Account();
        inactive.setAccountId(UUID.randomUUID());
        inactive.setAccountStatus("Inactive");

        when(accountRepository.findAllByClientId(sampleClientId)).thenReturn(List.of(active, inactive));

        accountService.deleteAccountByClientId(sampleClientId, sampleAgentId);

        assertEquals("Inactive", active.getAccountStatus());
        verify(sqsLogPublisher).publish(eq(sampleAgentId), eq("ACCOUNT_DELETED"), eq("ACCOUNT"),
                eq(active.getAccountId()), anyString());
        verify(sqsLogPublisher, never()).publish(eq(sampleAgentId), eq("ACCOUNT_DELETED"), eq("ACCOUNT"),
                eq(inactive.getAccountId()), anyString());
        verify(accountRepository).saveAll(anyList());
        verify(transactionRepository).deleteByClientId(sampleClientId);
        verify(sqsLogPublisher).publish(eq(sampleAgentId), eq("TRANSACTIONS_DELETED"), eq("CLIENT"),
                eq(sampleClientId), anyString());
    }

    @Test
    @DisplayName("deleteAccountByClientId handles empty account list and still deletes transactions")
    void deleteAccountByClientId_noAccounts_deletesTransactionsOnly() {
        when(accountRepository.findAllByClientId(sampleClientId)).thenReturn(List.of());

        accountService.deleteAccountByClientId(sampleClientId, sampleAgentId);

        verify(accountRepository).saveAll(List.of());
        verify(transactionRepository).deleteByClientId(sampleClientId);
    }
}
