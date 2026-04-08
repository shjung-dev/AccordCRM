package com.example.account_service.repository;

import com.example.account_service.model.AiChatAuditRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class AiChatAuditRepository {

    private final DynamoDbClient dynamoDbClient;

    @Value("${aws.dynamodb.ai-chatbot-audit-table:accord-crm-ai-chatbot-audit}")
    private String tableName;

    public void save(AiChatAuditRecord record) {
        dynamoDbClient.putItem(PutItemRequest.builder()
                .tableName(tableName)
                .item(Map.of(
                        "ai_chatbot_audit_id", AttributeValue.fromS(record.getAiChatbotAuditId()),
                        "user_id",             AttributeValue.fromS(record.getUserId()),
                        "session_id",          AttributeValue.fromS(record.getSessionId()),
                        "prompt",              AttributeValue.fromS(record.getPrompt()),
                        "response",            AttributeValue.fromS(record.getResponse()),
                        "model_used",          AttributeValue.fromS(record.getModelUsed()),
                        "input_tokens",        AttributeValue.fromN(String.valueOf(record.getInputTokens())),
                        "output_tokens",       AttributeValue.fromN(String.valueOf(record.getOutputTokens())),
                        "cache_hit",           AttributeValue.fromBool(record.isCacheHit()),
                        "created_at",          AttributeValue.fromS(record.getCreatedAt())
                ))
                .build());
    }

    /**
     * Returns all chat records for a user, ordered by created_at descending.
     * Uses the user-id-index GSI.
     */
    public List<AiChatAuditRecord> findByUserId(String userId) {
        QueryResponse response = dynamoDbClient.query(QueryRequest.builder()
                .tableName(tableName)
                .indexName("user-id-index")
                .keyConditionExpression("user_id = :uid")
                .expressionAttributeValues(Map.of(
                        ":uid", AttributeValue.fromS(userId)
                ))
                .scanIndexForward(false)
                .build());

        return response.items().stream()
                .map(this::mapToRecord)
                .toList();
    }

    /**
     * Returns all chat records for a session, ordered by created_at ascending.
     * Uses the session-id-index GSI.
     */
    public List<AiChatAuditRecord> findBySessionId(String sessionId) {
        QueryResponse response = dynamoDbClient.query(QueryRequest.builder()
                .tableName(tableName)
                .indexName("session-id-index")
                .keyConditionExpression("session_id = :sid")
                .expressionAttributeValues(Map.of(
                        ":sid", AttributeValue.fromS(sessionId)
                ))
                .scanIndexForward(true)
                .build());

        return response.items().stream()
                .map(this::mapToRecord)
                .toList();
    }

    private AiChatAuditRecord mapToRecord(Map<String, AttributeValue> item) {
        return AiChatAuditRecord.builder()
                .aiChatbotAuditId(item.get("ai_chatbot_audit_id").s())
                .userId(item.get("user_id").s())
                .sessionId(item.get("session_id").s())
                .prompt(item.get("prompt").s())
                .response(item.get("response").s())
                .modelUsed(item.get("model_used").s())
                .inputTokens(Integer.parseInt(item.get("input_tokens").n()))
                .outputTokens(Integer.parseInt(item.get("output_tokens").n()))
                .cacheHit(item.get("cache_hit").bool())
                .createdAt(item.get("created_at").s())
                .build();
    }
}
