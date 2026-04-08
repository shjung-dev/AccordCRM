package com.example.user_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.sqs.SqsClient;

@SpringBootTest
class UserServiceApplicationTests {

	@MockitoBean
	SqsClient sqsClient;

	@MockitoBean
	DynamoDbClient dynamoDbClient;

	@Test
	void contextLoads() {
	}

}
