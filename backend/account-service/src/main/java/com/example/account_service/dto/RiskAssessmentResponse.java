package com.example.account_service.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RiskAssessmentResponse {
    private String clientId;
    private int score;                        // 0–100 churn risk score
    private String riskLevel;                 // LOW | MEDIUM | HIGH
    private List<String> factors;             // churn indicators observed
    private List<String> retentionStrategies; // recommended agent actions
    private String summary;
    private String assessedAt;
    private boolean cacheHit;
}
