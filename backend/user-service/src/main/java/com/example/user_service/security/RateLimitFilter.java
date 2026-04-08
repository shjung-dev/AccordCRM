package com.example.user_service.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int EMAIL_ENDPOINT_LIMIT = 10;
    private static final int GENERAL_LIMIT = 60;
    private static final long WINDOW_MS = 60_000L;
    private static final long CLEANUP_INTERVAL_MS = 300_000L;

    private final ConcurrentHashMap<String, RateLimitEntry> store = new ConcurrentHashMap<>();
    private volatile long lastCleanup = System.currentTimeMillis();

    private static class RateLimitEntry {
        final AtomicInteger count = new AtomicInteger(1);
        final AtomicLong resetAt;

        RateLimitEntry(long resetAt) {
            this.resetAt = new AtomicLong(resetAt);
        }
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        cleanupIfNeeded();

        String clientIp = getClientIp(request);
        String path = request.getRequestURI();
        boolean isEmailEndpoint = path != null && path.startsWith("/api/users/email/");
        int limit = isEmailEndpoint ? EMAIL_ENDPOINT_LIMIT : GENERAL_LIMIT;

        String key = clientIp + ":" + (isEmailEndpoint ? "email" : "general");
        long now = System.currentTimeMillis();
        long resetAt = now + WINDOW_MS;

        RateLimitEntry entry = store.compute(key, (k, existing) -> {
            if (existing == null || existing.resetAt.get() <= now) {
                return new RateLimitEntry(resetAt);
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (entry.count.get() > limit) {
            long retryAfter = Math.max(1, (entry.resetAt.get() - now) / 1000);
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private void cleanupIfNeeded() {
        long now = System.currentTimeMillis();
        if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
        lastCleanup = now;
        store.entrySet().removeIf(e -> e.getValue().resetAt.get() <= now);
    }
}
