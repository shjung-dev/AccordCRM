package com.example.account_service.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Component
public class CognitoJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserServiceClient userServiceClient;

    public CognitoJwtConverter(UserServiceClient userServiceClient) {
        this.userServiceClient = userServiceClient;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String sub = jwt.getSubject();

        List<String> groups = jwt.getClaimAsStringList("cognito:groups");
        boolean isRootAdmin = groups != null && groups.contains("root_admin");
        boolean isAdmin = isRootAdmin || (groups != null && groups.contains("admin"));
        String role = isAdmin ? "admin" : "agent";

        UserServiceClient.UserDto user = userServiceClient.getUserBySub(sub);
        UUID userId = user != null ? user.getUserId() : null;

        AuthPrincipal principal = new AuthPrincipal(userId, role, isRootAdmin);
        return new UsernamePasswordAuthenticationToken(principal, jwt, Collections.emptyList());
    }
}
