package com.example.account_service.config;

import com.example.account_service.security.UserServiceClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    // Shared RestTemplate bean - uses default HttpClientFactory with connection pooling
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    public UserServiceClient userServiceClient(
            @Value("${user.service.url}") String url,
            @Value("${internal.service.key}") String key,
            RestTemplate restTemplate) {
        return new UserServiceClient(url, key, restTemplate);
    }
}
