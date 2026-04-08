package com.example.account_service.service;

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
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Component
public class SqsLogPublisher {

    private static final Logger log = LoggerFactory.getLogger(SqsLogPublisher.class);

    private final SqsClient sqsClient;
    private final ObjectMapper objectMapper;

    @Value("${log.queue.url}")
    private String queueUrl;

    public SqsLogPublisher(SqsClient sqsClient, ObjectMapper objectMapper) {
        this.sqsClient = sqsClient;
        this.objectMapper = objectMapper;
    }

    public void publish(UUID actorId, String action, String entityType, UUID entityId,
            String reason) {
        publish(actorId, action, entityType, entityId, reason, null, null, null, null);
    }

    public void publish(UUID actorId, String action, String entityType, UUID entityId,
            String reason,
            String attributeName, String beforeValue, String afterValue,
            String errorMessage) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("userId", actorId.toString());
        payload.put("action", action);
        payload.put("entityType", entityType);
        payload.put("entityId", entityId.toString());
        payload.put("actionStatus", "SUCCESS");
        payload.put("sourceService", "account-service");
        if (attributeName != null)
            payload.put("attributeName", attributeName);
        if (beforeValue != null)
            payload.put("beforeValue", beforeValue);
        if (afterValue != null)
            payload.put("afterValue", afterValue);
        if (errorMessage != null)
            payload.put("errorMessage", errorMessage);
        if (reason != null)
            payload.put("reason", reason);

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
                log.warn("Failed to serialize log event: {}", e.getMessage());
            } catch (Exception e) {
                log.warn("Failed to publish log event to SQS: {}", e.getMessage());
            }
        });
    }
}
