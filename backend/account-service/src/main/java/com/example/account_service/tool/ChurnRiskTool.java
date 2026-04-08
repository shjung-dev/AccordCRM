package com.example.account_service.tool;

import com.example.account_service.dto.RiskAssessmentResponse;
import com.example.account_service.service.RiskAssessmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChurnRiskTool implements ChatTool {

    private final RiskAssessmentService riskAssessmentService;

    @Override
    public String name() {
        return "churn_risk";
    }

    @Override
    public String description() {
        return "Calculates the churn risk score (0-100) for a client by client UUID. Returns risk level, churn signals, and retention strategies.";
    }

    @Override
    public String execute(String params) {
        UUID clientId;
        try {
            clientId = UUID.fromString(params.trim());
        } catch (IllegalArgumentException e) {
            return "Error: Invalid client ID format. Please provide a valid UUID.";
        }

        try {
            RiskAssessmentResponse result = riskAssessmentService.assessChurnRisk(clientId);

            StringBuilder sb = new StringBuilder();
            sb.append("Churn Risk Assessment for client ").append(clientId).append(":\n");
            sb.append("  Score: ").append(result.getScore()).append("/100\n");
            sb.append("  Risk Level: ").append(result.getRiskLevel()).append("\n");
            sb.append("  Summary: ").append(result.getSummary()).append("\n\n");

            sb.append("  Churn Signals:\n");
            for (String factor : result.getFactors()) {
                sb.append("    - ").append(factor).append("\n");
            }

            sb.append("\n  Recommended Retention Strategies:\n");
            for (String strategy : result.getRetentionStrategies()) {
                sb.append("    - ").append(strategy).append("\n");
            }

            return sb.toString();
        } catch (Exception e) {
            log.error("Churn risk tool failed for client {}: {}", clientId, e.getMessage());
            return "Unable to assess churn risk for client " + clientId + ". The client may not have any accounts.";
        }
    }
}
