package com.example.account_service.service;

import com.example.account_service.model.Account;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Component
public class SqsEmailPublisher {

    private static final Logger log = LoggerFactory.getLogger(SqsEmailPublisher.class);

    private final SqsClient sqsClient;
    private final ObjectMapper objectMapper;

    @Value("${email.queue.url}")
    private String queueUrl;

    public SqsEmailPublisher(SqsClient sqsClient, ObjectMapper objectMapper) {
        this.sqsClient = sqsClient;
        this.objectMapper = objectMapper;
    }

    public void publishAccountCreated(
            String to,
            String firstName,
            String lastName,
            Account account
    ) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("emailType", "ACCOUNT_CREATED");
        payload.put("to", to);
        payload.put("firstName", firstName);
        if (lastName != null && !lastName.isBlank()) {
            payload.put("lastName", lastName);
        }
        payload.put("accountId", account.getAccountId());
        payload.put("accountType", account.getAccountType());
        payload.put("openingDate", account.getOpeningDate());
        payload.put("currency", account.getCurrency());
        payload.put("balance", account.getBalance());
        payload.put("accountStatus", account.getAccountStatus());
        payload.put("sourceService", "account-service");

        send(payload);
    }

    public void publishAccountDeleted(
            String to,
            String firstName,
            String lastName,
            Account account
    ) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("emailType", "ACCOUNT_DELETED");
        payload.put("to", to);
        payload.put("firstName", firstName);
        if (lastName != null && !lastName.isBlank()) {
            payload.put("lastName", lastName);
        }
        payload.put("accountId", account.getAccountId());
        payload.put("accountType", account.getAccountType());
        payload.put("sourceService", "account-service");

        send(payload);
    }

    private void send(Map<String, Object> payload) {
        CompletableFuture.runAsync(() -> {
            try {
                String body = objectMapper.writeValueAsString(payload);
                sqsClient.sendMessage(SendMessageRequest.builder()
                        .queueUrl(queueUrl)
                        .messageBody(body)
                        .build());
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize email event: {}", e.getMessage());
            } catch (Exception e) {
                log.warn("Failed to publish email event to SQS: {}", e.getMessage());
            }
        });
    }
}