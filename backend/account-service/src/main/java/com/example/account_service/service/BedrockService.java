package com.example.account_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BedrockService {

    private final BedrockRuntimeClient bedrockRuntimeClient;
    private final ObjectMapper objectMapper;

    @Value("${bedrock.model-id:anthropic.claude-3-haiku-20240307-v1:0}")
    private String modelId;

    /**
     * Invokes Claude on Bedrock. Responses are cached by (systemPrompt, userMessage) key.
     * Cache name "bedrock-responses" TTL = 10 min (see CacheConfig).
     *
     * @return the assistant's text reply
     */
    @Cacheable(value = "bedrock-responses", cacheManager = "aiOutputCacheManager", key = "#systemPrompt + '||' + #userMessage")
    public String invoke(String systemPrompt, String userMessage) {
        try {
            String requestBody = objectMapper.writeValueAsString(Map.of(
                    "anthropic_version", "bedrock-2023-05-31",
                    "max_tokens", 1024,
                    "system", systemPrompt,
                    "messages", List.of(Map.of("role", "user", "content", userMessage))
            ));

            InvokeModelResponse response = bedrockRuntimeClient.invokeModel(
                    InvokeModelRequest.builder()
                            .modelId(modelId)
                            .contentType("application/json")
                            .accept("application/json")
                            .body(SdkBytes.fromUtf8String(requestBody))
                            .build());

            JsonNode root = objectMapper.readTree(response.body().asUtf8String());
            return root.path("content").get(0).path("text").asText();

        } catch (Exception e) {
            log.error("Bedrock invocation failed: {}", e.getMessage(), e);
            throw new RuntimeException("AI service unavailable", e);
        }
    }

    /**
     * Invokes Claude on Bedrock with a full conversation history for multi-turn chat.
     * Not cached — the same user message with different history produces different responses.
     *
     * @param systemPrompt the system instruction
     * @param messages     alternating user/assistant messages as {role, content} maps
     * @return the assistant's text reply
     */
    public String invokeWithHistory(String systemPrompt, List<Map<String, String>> messages) {
        try {
            String requestBody = objectMapper.writeValueAsString(Map.of(
                    "anthropic_version", "bedrock-2023-05-31",
                    "max_tokens", 1024,
                    "system", systemPrompt,
                    "messages", messages
            ));

            InvokeModelResponse response = bedrockRuntimeClient.invokeModel(
                    InvokeModelRequest.builder()
                            .modelId(modelId)
                            .contentType("application/json")
                            .accept("application/json")
                            .body(SdkBytes.fromUtf8String(requestBody))
                            .build());

            JsonNode root = objectMapper.readTree(response.body().asUtf8String());
            return root.path("content").get(0).path("text").asText();

        } catch (Exception e) {
            log.error("Bedrock multi-turn invocation failed: {}", e.getMessage(), e);
            throw new RuntimeException("AI service unavailable", e);
        }
    }

    /**
     * Returns the model ID configured for this service instance.
     */
    public String getModelId() {
        return modelId;
    }
}
