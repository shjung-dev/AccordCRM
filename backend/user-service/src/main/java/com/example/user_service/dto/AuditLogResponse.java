package com.example.user_service.dto;

public record AuditLogResponse(
        String logId,
        String userId,
        String action,
        String entityType,
        String entityId,
        String timestamp,
        String actionStatus,
        String sourceService,
        String attributeName,
        String beforeValue,
        String afterValue,
        String errorMessage,
        String reason
) {
}
