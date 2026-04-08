package com.example.account_service.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.hibernate.annotations.JdbcType;
import org.hibernate.type.descriptor.jdbc.CharJdbcType;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "accounts")
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "account_id", updatable = false, nullable = false)
    private UUID accountId;

    @Column(name = "client_id", nullable = false)
    private UUID clientId;

    @Column(name = "account_type", nullable = false)
    private String accountType;

    @Column(name = "account_status", nullable = false)
    private String accountStatus;

    @Column(name = "opening_date", nullable = false)
    private LocalDate openingDate;

    @Column(name = "balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal balance;

    @JdbcType(CharJdbcType.class)
    @Column(name = "currency", nullable = false, columnDefinition = "CHAR(3)", length = 3)
    private String currency;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "verification_status")
    private String verificationStatus;
    
    @Column(name = "assigned_agent_id")
    private UUID assignedAgentId;
}
