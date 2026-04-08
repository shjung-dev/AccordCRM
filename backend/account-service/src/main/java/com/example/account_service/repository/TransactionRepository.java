package com.example.account_service.repository;

import com.example.account_service.dto.AgentTransactionRow;
import com.example.account_service.model.Transaction;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findByClientId(UUID clientId);

    @Modifying
    @Transactional
    void deleteByClientId(UUID clientId);
    List<Transaction> findByAccountIdIn(List<UUID> accountIds);
    List<Transaction> findByAccountId(UUID accountId);

    Page<Transaction> findByAccountIdInOrderByCreatedAtDesc(List<UUID> accountIds, Pageable pageable);
    Page<Transaction> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<Transaction> findByClientIdOrderByCreatedAtDesc(UUID clientId, Pageable pageable);
    Page<Transaction> findByAccountIdOrderByCreatedAtDesc(UUID accountId, Pageable pageable);

    @Query("""
            select new com.example.account_service.dto.AgentTransactionRow(
                t.transactionId,
                t.clientId,
                t.accountId,
                t.transactionType,
                a.accountType,
                a.accountStatus,
                t.currency,
                t.amount,
                t.status,
                t.createdAt
            )
            from Transaction t
            join Account a
              on a.accountId = t.accountId
             and a.clientId = t.clientId
            where a.assignedAgentId = :agentId
            order by t.createdAt desc
            """)
    Page<AgentTransactionRow> findAgentTransactionRows(@Param("agentId") UUID agentId, Pageable pageable);
}
