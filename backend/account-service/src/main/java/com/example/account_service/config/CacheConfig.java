package com.example.account_service.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
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

        // ── AI Output Redis (Bedrock responses, risk scores) ────────────────────

        @Value("${redis.ai-output.host}")
        private String aiOutputHost;

        @Value("${redis.ai-output.port:6379}")
        private int aiOutputPort;

        // ── Account & Transaction Redis (account entity cache) ──────────────────

        @Value("${redis.account-transaction.host}")
        private String accountTransactionHost;

        @Value("${redis.account-transaction.port:6379}")
        private int accountTransactionPort;

        // ── Connection factories ─────────────────────────────────────────────────

        @Primary
        @Bean("aiOutputConnectionFactory")
        LettuceConnectionFactory aiOutputConnectionFactory() {
                return new LettuceConnectionFactory(
                                new RedisStandaloneConfiguration(aiOutputHost, aiOutputPort));
        }

        @Bean("accountTransactionConnectionFactory")
        LettuceConnectionFactory accountTransactionConnectionFactory() {
                return new LettuceConnectionFactory(
                                new RedisStandaloneConfiguration(accountTransactionHost, accountTransactionPort));
        }

        // ── Cache managers ───────────────────────────────────────────────────────

        /**
         * Primary cache manager backed by the AI Output Redis cluster.
         * Hosts:
         * - "bedrock-responses" TTL 10 min — raw Claude replies
         * - "risk-scores" TTL 5 min — churn assessments per clientId
         */
        @Primary
        @Bean("aiOutputCacheManager")
        RedisCacheManager aiOutputCacheManager(
                        @Qualifier("aiOutputConnectionFactory") LettuceConnectionFactory cf) {

                RedisCacheConfiguration base = jsonConfig();
                return RedisCacheManager.builder(cf)
                                .withCacheConfiguration("bedrock-responses", base.entryTtl(Duration.ofMinutes(10)))
                                .withCacheConfiguration("risk-scores", base.entryTtl(Duration.ofMinutes(5)))
                                .build();
        }

        /**
         * Cache manager backed by the Account & Transaction Redis cluster.
         * Hosts:
         * - "accounts-by-id" TTL 2 min — Account entity by accountId
         * - "accounts-by-client" TTL 2 min — List<Account> by clientId
         * - "users-by-sub" TTL 15 min — User lookup for JWT validation
         */
        @Bean("accountTransactionCacheManager")
        RedisCacheManager accountTransactionCacheManager(
                        @Qualifier("accountTransactionConnectionFactory") LettuceConnectionFactory cf) {

                RedisCacheConfiguration base = jsonConfig();
                return RedisCacheManager.builder(cf)
                                .withCacheConfiguration("accounts-by-id", base.entryTtl(Duration.ofMinutes(2)))
                                .withCacheConfiguration("accounts-by-client", base.entryTtl(Duration.ofMinutes(2)))
                                .withCacheConfiguration("users-by-sub", base.entryTtl(Duration.ofMinutes(15)))
                                .build();
        }

        // ── Shared serialization ─────────────────────────────────────────────────

        private RedisCacheConfiguration jsonConfig() {
                return RedisCacheConfiguration.defaultCacheConfig()
                                .serializeValuesWith(
                                                RedisSerializationContext.SerializationPair.fromSerializer(
                                                                RedisSerializer.json()))
                                .entryTtl(Duration.ofMinutes(10));
        }
}
