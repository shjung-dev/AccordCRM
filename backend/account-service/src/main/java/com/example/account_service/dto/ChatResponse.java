package com.example.account_service.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChatResponse {
    private String message;
    private String sessionId;
    private String modelUsed;
    private boolean cacheHit;
}
