package com.example.account_service.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatAuditRecord {
    private String aiChatbotAuditId;  // PK — UUID
    private String userId;
    private String sessionId;
    private String prompt;
    private String response;
    private String modelUsed;
    private int inputTokens;
    private int outputTokens;
    private boolean cacheHit;
    private String createdAt;         // ISO-8601
}
