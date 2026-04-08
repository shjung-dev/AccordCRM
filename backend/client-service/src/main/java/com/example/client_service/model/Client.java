package com.example.client_service.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "clients")
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID) 
    @Column(name = "client_id", updatable = false, nullable = false)
    private UUID clientId;

    @Column(name = "first_name", nullable = false) 
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Column(name = "gender", nullable = false) 
    private String gender;

    @Column(name = "email_address", nullable = false, unique = true)
    private String emailAddress;

    @Column(name = "phone_number", nullable = false)
    private String phoneNumber;

    @Column(name = "address",nullable = false) 
    private String address;

    @Column(name = "city", nullable = false) 
    private String city;

    @Column(name = "state", nullable = false) 
    private String state;

    @Column(name = "country", nullable = false) 
    private String country;

    @Column(name = "postal_code", nullable = false) 
    private String postalCode;

    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "verification_method")
    private String verificationMethod;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "deletion_reason")
    private String deletionReason;

    @Column(name = "assigned_agent_id")
    private UUID assignedAgentId;

    @Column(name = "identification_number", unique = true, nullable = false, length = 64)
    private String identificationNumber;


    @PrePersist
    void onCreate() {
        final Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
