package com.example.account_service.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
public class ClientDirectoryClient {
    private final RestTemplate restTemplate;
    private final String clientServiceBaseUrl;

    public ClientDirectoryClient(@Value("${client.service.url}") String clientServiceBaseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.restTemplate = new RestTemplate(factory);
        this.clientServiceBaseUrl = clientServiceBaseUrl;
    }

    public Optional<ClientRecord> fetchClient(UUID clientId, String authHeader) {
        String url = clientServiceBaseUrl + "/api/clients/" + clientId;
        HttpHeaders headers = new HttpHeaders();
        if (authHeader != null && !authHeader.isBlank()) {
            headers.set("Authorization", authHeader);
        }
        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<ClientRecord> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    request,
                    ClientRecord.class
            );
            return Optional.ofNullable(response.getBody());
        } catch (RestClientException ex) {
            return Optional.empty();
        }
    }

    /**
     * Fetches all clients assigned to a specific agent via the client-service.
     * Uses Cloud Map service discovery (client.accord-crm.local).
     *
     * @param agentId    the agent's user ID
     * @param authHeader the caller's Authorization header (forwarded for permission checks)
     * @return list of client records, or empty list on failure
     */
    public List<ClientRecord> fetchClientsByAgent(UUID agentId, String authHeader) {
        String url = clientServiceBaseUrl + "/api/clients/agent/" + agentId;
        HttpHeaders headers = new HttpHeaders();
        if (authHeader != null && !authHeader.isBlank()) {
            headers.set("Authorization", authHeader);
        }
        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<List<ClientRecord>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    request,
                    new ParameterizedTypeReference<>() {}
            );
            List<ClientRecord> body = response.getBody();
            return body != null ? body : Collections.emptyList();
        } catch (RestClientException ex) {
            log.warn("Failed to fetch clients for agent {}: {}", agentId, ex.getMessage());
            return Collections.emptyList();
        }
    }
}
