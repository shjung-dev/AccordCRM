package com.example.account_service.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChatSessionSummary {
    private String sessionId;
    private String firstMessage;
    private String createdAt;
    private int messageCount;
}
