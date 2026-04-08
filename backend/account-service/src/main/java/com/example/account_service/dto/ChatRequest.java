package com.example.account_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class ChatRequest {
    @NotBlank
    @Size(max = 4000, message = "Message must not exceed 4000 characters")
    private String message;
    private String sessionId;
    private UUID accountId; // optional — if provided, account context is included in the prompt
}
