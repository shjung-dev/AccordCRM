package com.example.client_service.security;

import java.util.UUID;

public class AuthPrincipal {
    private final UUID userId;
    private final String role;
    private final boolean isRootAdmin;

    public AuthPrincipal(UUID userId, String role, boolean isRootAdmin) {
        this.userId = userId;
        this.role = role;
        this.isRootAdmin = isRootAdmin;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getRole() {
        return role;
    }

    public boolean isRootAdmin() {
        return isRootAdmin;
    }

    public boolean isAdmin() {
        return "admin".equals(role);
    }

    public boolean isAgent() {
        return "agent".equals(role);
    }
}
