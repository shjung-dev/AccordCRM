package com.example.account_service.tool;

import com.example.account_service.integration.ClientDirectoryClient;
import com.example.account_service.integration.ClientRecord;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ClientLookupTool implements ChatTool {

    private final ClientDirectoryClient clientDirectoryClient;

    private String authHeader;

    @Override
    public String name() {
        return "client_lookup";
    }

    @Override
    public String description() {
        return "Looks up a client's name and email by client UUID. Use this to identify who a client is before analysing their data.";
    }

    /** Must be called before execute() to set the auth context for cross-service calls */
    public void setAuthHeader(String authHeader) {
        this.authHeader = authHeader;
    }

    @Override
    public String execute(String params) {
        UUID clientId;
        try {
            clientId = UUID.fromString(params.trim());
        } catch (IllegalArgumentException e) {
            return "Error: Invalid client ID format. Please provide a valid UUID.";
        }

        Optional<ClientRecord> client = clientDirectoryClient.fetchClient(clientId, authHeader);
        if (client.isEmpty()) {
            return "No client found with ID " + clientId;
        }

        ClientRecord c = client.get();
        StringBuilder sb = new StringBuilder();
        sb.append("Client found:\n");
        sb.append("  Name: ").append(c.getFullName()).append("\n");
        sb.append("  Email: ").append(c.getEmailAddress()).append("\n");
        sb.append("  Client ID: ").append(c.getClientId()).append("\n");
        return sb.toString();
    }
}
