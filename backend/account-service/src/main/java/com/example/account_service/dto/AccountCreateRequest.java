package com.example.account_service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Setter
@Getter
public class AccountCreateRequest {
    @NotNull
    private UUID clientId;

    @NotBlank
    @Pattern(regexp = "^(Checking|Savings|Business)$",
             message = "Account type must be one of: Checking, Savings, Business")
    private String accountType;

    @NotBlank
    @Pattern(regexp = "^(Active|Inactive|Pending)$",
             message = "Account status must be one of: Active, Inactive, Pending")
    private String accountStatus;

    @NotNull
    private LocalDate openingDate;

    @NotNull
    @DecimalMin(value = "0.00", message = "Balance must be 0 or greater")
    private BigDecimal balance;

    @NotBlank
    @Size(min = 3, max = 3, message = "Currency must be exactly 3 characters")
    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a 3-letter uppercase ISO code (e.g. SGD, USD)")
    private String currency;

    @NotNull
    private UUID branchId;

    private String verificationStatus;

    private UUID assignedAgentId;

}
