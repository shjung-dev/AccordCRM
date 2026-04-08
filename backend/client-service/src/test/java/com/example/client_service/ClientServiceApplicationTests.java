package com.example.client_service;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class ClientServiceApplicationTests {

	// Prevent actual Redis connection — CacheConfig beans are replaced by mocks
	@MockitoBean
	LettuceConnectionFactory lettuceConnectionFactory;

	@MockitoBean
	RedisCacheManager redisCacheManager;

	// Prevent Flyway migrations from running — FlywayConfig bean is replaced by mock
	@MockitoBean(name = "flyway")
	Flyway flyway;

	@Test
	void contextLoads() {
	}

}
