package com.example.user_service.repository;

import com.example.user_service.dto.AuditLogResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;
import software.amazon.awssdk.services.dynamodb.model.ScanRequest;
import software.amazon.awssdk.services.dynamodb.model.ScanResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Repository
public class AuditLogRepository {

    private static final Logger log = LoggerFactory.getLogger(AuditLogRepository.class);

    private final DynamoDbClient dynamoDbClient;

    @Value("${aws.dynamodb.log-table:accord-crm-log}")
    private String tableName;

    public AuditLogRepository(DynamoDbClient dynamoDbClient) {
        this.dynamoDbClient = dynamoDbClient;
    }

    public List<AuditLogResponse> findAllLogs() {
        List<AuditLogResponse> logs = new ArrayList<>();
        Map<String, AttributeValue> lastEvaluatedKey = null;

        do {
            ScanRequest request = ScanRequest.builder()
                    .tableName(tableName)
                    .exclusiveStartKey(lastEvaluatedKey)
                    .build();
            ScanResponse response = dynamoDbClient.scan(request);
            response.items().forEach(item -> logs.add(toLog(item)));
            lastEvaluatedKey = response.lastEvaluatedKey();
        } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

        return logs;
    }

    public List<AuditLogResponse> findLogsByUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            return List.of();
        }

        // Try GSI query first; fall back to scan with filter if the index doesn't exist
        try {
            List<AuditLogResponse> logs = new ArrayList<>();
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                QueryRequest request = QueryRequest.builder()
                        .tableName(tableName)
                        .indexName("user-id-index")
                        .keyConditionExpression("user_id = :uid")
                        .expressionAttributeValues(Map.of(
                                ":uid", AttributeValue.fromS(userId)
                        ))
                        .exclusiveStartKey(lastEvaluatedKey)
                        .build();
                QueryResponse response = dynamoDbClient.query(request);
                response.items().forEach(item -> logs.add(toLog(item)));
                lastEvaluatedKey = response.lastEvaluatedKey();
            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            return logs;
        } catch (Exception e) {
            // GSI unavailable — fall back to full scan with filter
            log.warn("GSI query failed, falling back to scan: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            List<AuditLogResponse> logs = new ArrayList<>();
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                ScanRequest request = ScanRequest.builder()
                        .tableName(tableName)
                        .filterExpression("user_id = :uid")
                        .expressionAttributeValues(Map.of(
                                ":uid", AttributeValue.fromS(userId)
                        ))
                        .exclusiveStartKey(lastEvaluatedKey)
                        .build();
                ScanResponse response = dynamoDbClient.scan(request);
                response.items().forEach(item -> logs.add(toLog(item)));
                lastEvaluatedKey = response.lastEvaluatedKey();
            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            return logs;
        }
    }

    public List<AuditLogResponse> findLogsByUserIds(Set<String> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }

        List<AuditLogResponse> allLogs = new ArrayList<>();
        Set<String> deduped = new HashSet<>(userIds);
        for (String userId : deduped) {
            allLogs.addAll(findLogsByUserId(userId));
        }
        return allLogs;
    }

    private AuditLogResponse toLog(Map<String, AttributeValue> item) {
        return new AuditLogResponse(
                getS(item, "log_id"),
                getS(item, "user_id"),
                getS(item, "action"),
                getS(item, "entity_type"),
                getS(item, "entity_id"),
                getS(item, "timestamp"),
                getS(item, "action_status"),
                getS(item, "source_service"),
                getS(item, "attribute_name"),
                getS(item, "before_value"),
                getS(item, "after_value"),
                getS(item, "error_message"),
                getS(item, "reason")
        );
    }

    private String getS(Map<String, AttributeValue> item, String key) {
        AttributeValue value = item.get(key);
        if (value == null) {
            return null;
        }
        return value.s();
    }
}
