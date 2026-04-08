package com.example.user_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Component
public class ClientServiceClient {

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public ClientServiceClient(RestTemplate restTemplate,
            @Value("${client-service.base-url}") String baseUrl) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
    }

    public List<UUID> getActiveClientIdsByAgentId(UUID agentId, String authToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", authToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<List<UUID>> response = restTemplate.exchange(
                baseUrl + "/api/clients/agent/" + agentId + "/ids",
                HttpMethod.GET,
                entity,
                new ParameterizedTypeReference<List<UUID>>() {
                });
        return response.getBody() != null ? response.getBody() : new ArrayList<>();
    }

    public void reassignClient(UUID clientId, UUID newAgentId, String authToken) {
        String url = baseUrl + "/api/clients/" + clientId;
        Map<String, String> body = Collections.singletonMap("assignedAgentId", newAgentId.toString());

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", authToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
        restTemplate.exchange(url, HttpMethod.PUT, request, Void.class);
    }

    public void unassignClient(UUID clientId, String authToken) {
        String url = baseUrl + "/api/clients/" + clientId;
        Map<String, Object> body = Collections.singletonMap("assignedAgentId", null);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", authToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        restTemplate.exchange(url, HttpMethod.PUT, request, Void.class);
    }
}