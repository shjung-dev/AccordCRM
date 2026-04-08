package com.example.client_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;

import java.time.Duration;

@Configuration
@EnableCaching
public class CacheConfig {

    @Value("${redis.client.host}")
    private String clientRedisHost;

    @Value("${redis.client.port}")
    private int clientRedisPort;

    // ── Creates connection pool to Redis
    @Bean
    public LettuceConnectionFactory clientRedisConnectionFactory() {
        return new LettuceConnectionFactory(
                new RedisStandaloneConfiguration(clientRedisHost, clientRedisPort));
    }

    // ── Cache manager
    @Bean
    public RedisCacheManager clientCacheManager(LettuceConnectionFactory connectionFactory) {

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .serializeValuesWith( // Java Objects <-> JSON Conversion
                        RedisSerializationContext.SerializationPair.fromSerializer(
                                RedisSerializer.json()))
                .entryTtl(Duration.ofMinutes(10));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)

                // Single client lookup
                .withCacheConfiguration("clients-by-id", defaultConfig.entryTtl(Duration.ofMinutes(10)))

                // Agent -> list of clients under particualr agent
                .withCacheConfiguration("clients-by-agent", defaultConfig.entryTtl(Duration.ofMinutes(10)))

                // Number of clients under particular agent
                .withCacheConfiguration("client-count-by-agent", defaultConfig.entryTtl(Duration.ofMinutes(10)))

                // User lookup by Cognito sub (JWT validation cache)
                .withCacheConfiguration("users-by-sub", defaultConfig.entryTtl(Duration.ofMinutes(15)))

                .build();
    }
}