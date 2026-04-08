package com.example.user_service.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class InternalKeyFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(InternalKeyFilter.class);

    private final String internalServiceKey;

    public InternalKeyFilter(@Value("${internal.service.key}") String internalServiceKey) {
        this.internalServiceKey = internalServiceKey;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (path.startsWith("/api/users/email/") || path.startsWith("/api/users/sub/")) {
            String key = request.getHeader("X-Internal-Key");
            String remoteAddr = request.getRemoteAddr();
            if (!internalServiceKey.equals(key)) {
                log.warn("Rejected internal request: path={} remoteAddr={}", path, remoteAddr);
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"message\":\"Unauthorized\"}");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
