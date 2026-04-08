package com.example.account_service.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChatHistoryEntry {
    private String role;
    private String content;
    private String timestamp;
}
