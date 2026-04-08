package com.example.client_service.integration;

import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

public class AccountServiceClient {

    private final String accountServiceUrl;
    private final String internalServiceKey;
    private final RestTemplate restTemplate;

    public AccountServiceClient(String accountServiceUrl, String internalServiceKey, RestTemplate restTemplate) {
        this.accountServiceUrl = accountServiceUrl;
        this.internalServiceKey = internalServiceKey;
        this.restTemplate = restTemplate;
    }

    public void deleteAccountsByClientId(UUID clientId, UUID actorId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Internal-Key", internalServiceKey);
        headers.set("X-Actor-Id", actorId.toString());
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        restTemplate.exchange(
                accountServiceUrl + "/api/accounts/DeleteByClientId/" + clientId,
                HttpMethod.DELETE,
                entity,
                Void.class);
    }
}
