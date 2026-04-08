package com.example.account_service.repository;

import com.example.account_service.model.RiskScoreRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class RiskScoreRepository {

    private final DynamoDbClient dynamoDbClient;

    @Value("${aws.dynamodb.risk-score-table:accord-crm-risk-score}")
    private String tableName;

    public void save(RiskScoreRecord record) {
        dynamoDbClient.putItem(PutItemRequest.builder()
                .tableName(tableName)
                .item(Map.of(
                        "risk_score_id",       AttributeValue.fromS(record.getRiskScoreId()),
                        "client_id",           AttributeValue.fromS(record.getClientId()),
                        "score",               AttributeValue.fromN(String.valueOf(record.getScore())),
                        "risk_level",          AttributeValue.fromS(record.getRiskLevel()),
                        "factors",             AttributeValue.fromS(record.getFactors()),
                        "retention_strategies",AttributeValue.fromS(record.getRetentionStrategies()),
                        "summary",             AttributeValue.fromS(record.getSummary()),
                        "model_used",          AttributeValue.fromS(record.getModelUsed()),
                        "assessed_at",         AttributeValue.fromS(record.getAssessedAt())
                ))
                .build());
    }

    /**
     * Returns all churn risk assessments for a client, most recent first.
     * Uses the client-id-index GSI.
     */
    public List<RiskScoreRecord> findByClientId(String clientId) {
        QueryResponse response = dynamoDbClient.query(QueryRequest.builder()
                .tableName(tableName)
                .indexName("client-id-index")
                .keyConditionExpression("client_id = :cid")
                .expressionAttributeValues(Map.of(
                        ":cid", AttributeValue.fromS(clientId)
                ))
                .scanIndexForward(false)
                .build());

        return response.items().stream()
                .map(item -> RiskScoreRecord.builder()
                        .riskScoreId(item.get("risk_score_id").s())
                        .clientId(item.get("client_id").s())
                        .score(Integer.parseInt(item.get("score").n()))
                        .riskLevel(item.get("risk_level").s())
                        .factors(item.get("factors").s())
                        .retentionStrategies(item.get("retention_strategies").s())
                        .summary(item.get("summary").s())
                        .modelUsed(item.get("model_used").s())
                        .assessedAt(item.get("assessed_at").s())
                        .build())
                .toList();
    }
}
