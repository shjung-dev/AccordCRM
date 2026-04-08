package com.example.account_service.tool;

import com.example.account_service.integration.ClientDirectoryClient;
import com.example.account_service.integration.ClientRecord;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Chat tool that searches the agent's clients by name via the client-service
 * (Cloud Map service discovery).
 *
 * Fetches the agent's full client list, then filters locally by
 * case-insensitive name match. This ensures agents can only find
 * their own clients — enforced by the client-service API.
 *
 * Requires agentId and authHeader to be set before execute().
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ClientSearchTool implements ChatTool {

    private final ClientDirectoryClient clientDirectoryClient;

    private UUID agentId;
    private String authHeader;

    @Override
    public String name() {
        return "client_search";
    }

    @Override
    public String description() {
        return "Searches your clients by name. Provide a first name, last name, or full name to find matching clients.";
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

        if (params == null || params.isBlank()) {
            return "Error: Please provide a name to search for.";
        }

        String query = params.trim().toLowerCase();

        List<ClientRecord> allClients = clientDirectoryClient.fetchClientsByAgent(agentId, authHeader);

        if (allClients.isEmpty()) {
            return "You have no clients assigned to you.";
        }

        List<ClientRecord> matches = allClients.stream()
                .filter(c -> {
                    String fullName = c.getFullName().toLowerCase();
                    String firstName = c.getFirstName() != null ? c.getFirstName().toLowerCase() : "";
                    String lastName = c.getLastName() != null ? c.getLastName().toLowerCase() : "";
                    return fullName.contains(query) || firstName.contains(query) || lastName.contains(query);
                })
                .toList();

        if (matches.isEmpty()) {
            return "No clients found matching \"" + params.trim() + "\".";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Found ").append(matches.size()).append(" client(s) matching \"").append(params.trim()).append("\":\n\n");

        int index = 1;
        for (ClientRecord c : matches) {
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
