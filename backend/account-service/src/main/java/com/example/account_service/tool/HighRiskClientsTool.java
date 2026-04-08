package com.example.account_service.tool;

import com.example.account_service.dto.RiskAssessmentResponse;
import com.example.account_service.integration.ClientDirectoryClient;
import com.example.account_service.integration.ClientRecord;
import com.example.account_service.service.RiskAssessmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Chat tool that returns the top N highest churn-risk clients for the current agent.
 *
 * Fetches the agent's client list from the client-service via Cloud Map service
 * discovery, then runs a risk assessment on each using local account/transaction
 * data + Bedrock AI. Results are sorted by risk score descending.
 *
 * Requires agentId and authHeader to be set before execute().
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HighRiskClientsTool implements ChatTool {

    private final ClientDirectoryClient clientDirectoryClient;
    private final RiskAssessmentService riskAssessmentService;

    private static final int DEFAULT_COUNT = 5;
    private static final int MAX_COUNT = 10;

    private UUID agentId;
    private String authHeader;

    @Override
    public String name() {
        return "high_risk_clients";
    }

    @Override
    public String description() {
        return "Returns your top N highest churn-risk clients (default 5, max 10). Analyses your clients and ranks them by risk score.";
    }

    public void setAgentId(UUID agentId) {
        this.agentId = agentId;
    }

    public void setAuthHeader(String authHeader) {
        this.authHeader = authHeader;
    }

    @Override
    public String execute(String params) {
        if (agentId == null) {
            return "Error: Unable to determine your agent identity.";
        }

        int count = DEFAULT_COUNT;
        if (params != null && !params.isBlank()) {
            try {
                count = Math.min(MAX_COUNT, Math.max(1, Integer.parseInt(params.trim())));
            } catch (NumberFormatException e) {
                // use default
            }
        }

        // Fetch agent's clients from client-service via service discovery
        List<ClientRecord> clients = clientDirectoryClient.fetchClientsByAgent(agentId, authHeader);

        if (clients.isEmpty()) {
            return "You have no clients assigned to you.";
        }

        // Build a name lookup map for friendly output
        Map<UUID, String> clientNames = new HashMap<>();
        for (ClientRecord c : clients) {
            clientNames.put(c.getClientId(), c.getFullName());
        }

        // Assess each client — RiskAssessmentService caches results
        List<RiskAssessmentResponse> assessments = new ArrayList<>();
        for (ClientRecord client : clients) {
            try {
                assessments.add(riskAssessmentService.assessChurnRisk(client.getClientId()));
            } catch (Exception e) {
                log.warn("Skipping client {} during risk scan: {}", client.getClientId(), e.getMessage());
            }
        }

        if (assessments.isEmpty()) {
            return "Unable to assess any of your clients at this time.";
        }

        // Sort by score descending and take top N
        assessments.sort((a, b) -> Integer.compare(b.getScore(), a.getScore()));
        List<RiskAssessmentResponse> topN = assessments.subList(0, Math.min(count, assessments.size()));

        StringBuilder sb = new StringBuilder();
        sb.append("Top ").append(topN.size()).append(" highest churn-risk clients:\n\n");

        int rank = 1;
        for (RiskAssessmentResponse r : topN) {
            String name = clientNames.getOrDefault(r.getClientId(), "Unknown");
            sb.append(rank++).append(". ").append(name).append(" (").append(r.getClientId()).append(")\n");
            sb.append("   Score: ").append(r.getScore()).append("/100 (").append(r.getRiskLevel()).append(")\n");
            sb.append("   Summary: ").append(r.getSummary()).append("\n\n");
        }

        return sb.toString();
    }
}
