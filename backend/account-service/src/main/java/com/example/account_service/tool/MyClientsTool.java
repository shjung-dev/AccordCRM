package com.example.account_service.tool;

import com.example.account_service.integration.ClientDirectoryClient;
import com.example.account_service.integration.ClientRecord;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Chat tool that fetches all clients assigned to the current agent
 * via the client-service (Cloud Map service discovery).
 *
 * Requires agentId and authHeader to be set before execute().
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MyClientsTool implements ChatTool {

    private final ClientDirectoryClient clientDirectoryClient;

    private UUID agentId;
    private String authHeader;

    @Override
    public String name() {
        return "my_clients";
    }

    @Override
    public String description() {
        return "Returns all clients assigned to you (the current agent). Shows each client's name, email, phone, and ID.";
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

        List<ClientRecord> clients = clientDirectoryClient.fetchClientsByAgent(agentId, authHeader);

        if (clients.isEmpty()) {
            return "You have no clients assigned to you.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("You have ").append(clients.size()).append(" client(s):\n\n");

        int index = 1;
        for (ClientRecord c : clients) {
            sb.append(index++).append(". ").append(c.getFullName()).append("\n");
            sb.append("   Email: ").append(c.getEmailAddress()).append("\n");
            if (c.getPhoneNumber() != null && !c.getPhoneNumber().isBlank()) {
                sb.append("   Phone: ").append(c.getPhoneNumber()).append("\n");
            }
            sb.append("   Client ID: ").append(c.getClientId()).append("\n\n");
        }

        return sb.toString();
    }
}
