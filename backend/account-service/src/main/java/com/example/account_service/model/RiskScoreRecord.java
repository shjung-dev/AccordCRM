package com.example.account_service.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskScoreRecord {
    private String riskScoreId;         // PK — UUID
    private String clientId;            // GSI hash key (client-id-index)
    private int score;                  // 0–100 churn risk score
    private String riskLevel;           // LOW | MEDIUM | HIGH
    private String factors;             // JSON array — churn indicators observed
    private String retentionStrategies; // JSON array — recommended agent actions
    private String summary;
    private String modelUsed;
    private String assessedAt;          // ISO-8601
}
