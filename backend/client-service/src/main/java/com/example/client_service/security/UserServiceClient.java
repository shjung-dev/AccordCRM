package com.example.client_service.security;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

public class UserServiceClient {

    private final String userServiceUrl;
    private final String internalServiceKey;
    private final RestTemplate restTemplate;

    public UserServiceClient(String userServiceUrl, String internalServiceKey, RestTemplate restTemplate) {
        this.userServiceUrl = userServiceUrl;
        this.internalServiceKey = internalServiceKey;
        this.restTemplate = restTemplate;
    }

    public UserDto getUserByEmail(String email) {
        String encoded = URLEncoder.encode(email, StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Internal-Key", internalServiceKey);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<UserDto> response = restTemplate.exchange(
                userServiceUrl + "/api/users/email/" + encoded,
                HttpMethod.GET, entity, UserDto.class);
        return response.getBody();
    }

    @Cacheable(value = "users-by-sub", key = "#sub", cacheManager = "clientCacheManager")
    public UserDto getUserBySub(String sub) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Internal-Key", internalServiceKey);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        try {
            ResponseEntity<UserDto> response = restTemplate.exchange(
                    userServiceUrl + "/api/users/sub/" + sub,
                    HttpMethod.GET, entity, UserDto.class);
            return response.getBody();
        } catch (Exception e) {
            return null;
        }
    }

    public static class UserDto {
        private UUID userId;
        private Boolean isAdmin;
        private Boolean isRootAdmin;

        public UserDto() {}

        public UUID getUserId() { return userId; }
        public void setUserId(UUID userId) { this.userId = userId; }
        public Boolean getIsAdmin() { return isAdmin; }
        public void setIsAdmin(Boolean isAdmin) { this.isAdmin = isAdmin; }
        public Boolean getIsRootAdmin() { return isRootAdmin; }
        public void setIsRootAdmin(Boolean isRootAdmin) { this.isRootAdmin = isRootAdmin; }
    }
}
