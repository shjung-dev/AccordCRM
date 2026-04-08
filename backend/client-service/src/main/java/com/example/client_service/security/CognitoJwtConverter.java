package com.example.client_service.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

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
        if (user == null) {
            throw new InvalidBearerTokenException("User not found for Cognito sub: " + sub);
        }

        AuthPrincipal principal = new AuthPrincipal(user.getUserId(), role, isRootAdmin);
        return new UsernamePasswordAuthenticationToken(principal, jwt, Collections.emptyList());
    }
}
