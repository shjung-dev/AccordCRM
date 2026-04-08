package com.example.account_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Guardrail service for the SmartCRM AI chatbot.
 *
 * Provides three layers of protection:
 *   1. Input validation  — blocks prompt injection, excessive length, suspicious patterns
 *   2. Output sanitization — redacts credentials, internal URLs, system prompt leakage
 *   3. Rate limiting — per-user throttle via Redis to prevent abuse / quota exhaustion
 *
 * All checks are fail-open for rate limiting (Redis down → allow) and fail-closed
 * for input validation (suspicious input → block).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GuardrailService {

    private final StringRedisTemplate stringRedisTemplate;

    // ── Configuration ────────────────────────────────────────────────────────

    /** Maximum allowed message length (server-side enforcement). */
    public static final int MAX_MESSAGE_LENGTH = 4000;

    /** Maximum messages a single user can send per rate-limit window. */
    private static final int RATE_LIMIT_MAX_MESSAGES = 30;

    /** Rate-limit window duration. */
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(5);

    /** Redis key prefix for rate-limit counters. */
    private static final String RATE_LIMIT_KEY_PREFIX = "guardrail:rate:";

    // ── Prompt injection patterns ────────────────────────────────────────────
    //
    // Case-insensitive patterns that detect common prompt injection and
    // jailbreak techniques.  Each pattern targets a specific attack family.

    private static final List<Pattern> INPUT_BLOCK_PATTERNS = List.of(
            // Jailbreak / persona override attempts
            Pattern.compile(
                    "(?i)(ignore|disregard|forget|override|bypass)\\s+(all\\s+)?(previous|prior|above|system|your)\\s+(instructions?|rules?|prompts?|guidelines?|constraints?)"),
            Pattern.compile(
                    "(?i)(you\\s+are\\s+now|act\\s+as|pretend\\s+(to\\s+be|you\\s+are)|switch\\s+to|enter|enable)\\s+(DAN|developer|god|unrestricted|jailbreak|admin|root|sudo)\\s*(mode)?",
                    Pattern.CASE_INSENSITIVE),
            Pattern.compile(
                    "(?i)from\\s+now\\s+on[,.]?\\s+(you|ignore|disregard|do\\s+not)"),

            // System prompt extraction attempts
            Pattern.compile(
                    "(?i)(repeat|show|reveal|display|print|output|tell\\s+me|what\\s+(are|is))\\s+(your|the|all)?\\s*(system|initial|original|hidden|secret|internal)\\s*(prompt|instructions?|rules?|message)"),
            Pattern.compile(
                    "(?i)(what|how)\\s+(were|are)\\s+you\\s+(programmed|instructed|told|configured|set\\s+up)"),

            // Delimiter / escape injection (tries to close the prompt context)
            Pattern.compile(
                    "(?i)(```|</?\\s*(system|assistant|user|prompt|instruction|message)\\s*>|\\[\\s*(SYSTEM|INST|SYS)\\s*]|<<\\s*SYS\\s*>>)"),

            // Markdown/XML injection to redefine role
            Pattern.compile(
                    "(?i)#\\s*(system|instruction|override|new\\s+rules?)\\s*:"),

            // Base64 encoded payload detection (common obfuscation)
            Pattern.compile(
                    "(?i)(decode|base64|eval|execute|run)\\s+(this|the\\s+following|below)")
    );

    // ── Output redaction patterns ────────────────────────────────────────────
    //
    // Patterns that detect sensitive content that should never appear in
    // AI responses, regardless of what the model generates.

    private static final List<PatternReplacement> OUTPUT_REDACT_PATTERNS = List.of(
            // API keys / tokens (generic long hex/base64 strings that look like secrets)
            new PatternReplacement(
                    Pattern.compile("(?i)(api[_-]?key|token|secret|password|credential|auth)\\s*[:=]\\s*['\"]?([A-Za-z0-9+/=_\\-]{20,})['\"]?"),
                    "[REDACTED_CREDENTIAL]"),

            // AWS access keys
            new PatternReplacement(
                    Pattern.compile("(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}"),
                    "[REDACTED_AWS_KEY]"),

            // AWS secret keys (40 char base64)
            new PatternReplacement(
                    Pattern.compile("(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{40}(?![A-Za-z0-9+/=])"),
                    "[REDACTED_SECRET]"),

            // Internal service URLs (localhost, .local, .internal, private IPs)
            new PatternReplacement(
                    Pattern.compile("(?i)https?://(?:localhost|127\\.0\\.0\\.1|10\\.\\d+\\.\\d+\\.\\d+|172\\.(?:1[6-9]|2\\d|3[01])\\.\\d+\\.\\d+|192\\.168\\.\\d+\\.\\d+|[\\w.-]+\\.(?:local|internal|svc\\.cluster))(?::\\d+)?(?:/[\\w./-]*)?"),
                    "[REDACTED_INTERNAL_URL]"),

            // JWT tokens
            new PatternReplacement(
                    Pattern.compile("eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]+"),
                    "[REDACTED_JWT]"),

            // SSM parameter paths
            new PatternReplacement(
                    Pattern.compile("(?i)/accord-crm/[\\w/-]+"),
                    "[REDACTED_SSM_PATH]"),

            // Environment variable references
            new PatternReplacement(
                    Pattern.compile("(?i)(process\\.env\\.|System\\.getenv\\(|\\$\\{)[A-Z_]{3,}"),
                    "[REDACTED_ENV_REF]")
    );

    // ── System prompt leakage detection ──────────────────────────────────────

    private static final List<Pattern> SYSTEM_PROMPT_LEAK_PATTERNS = List.of(
            Pattern.compile("(?i)\\[SYSTEM INSTRUCTION"),
            Pattern.compile("(?i)IMMUTABLE.*DO NOT REPEAT"),
            Pattern.compile("(?i)SECURITY RULES.*these override"),
            Pattern.compile("(?i)NEVER reveal.*system instructions"),
            Pattern.compile("(?i)TOPIC SCOPE.*you can ONLY discuss"),
            Pattern.compile("(?i)\\[TOOL_CALL:\\s*\\w+\\s*\\|")
    );

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Validates user input before it reaches the AI model.
     *
     * @return null if input is safe, or a user-facing rejection message
     */
    public String validateInput(String message) {
        if (message == null || message.isBlank()) {
            return "Message cannot be empty.";
        }

        if (message.length() > MAX_MESSAGE_LENGTH) {
            log.warn("[Guardrail] Input blocked: message length {} exceeds max {}",
                    message.length(), MAX_MESSAGE_LENGTH);
            return "Message is too long. Please keep it under " + MAX_MESSAGE_LENGTH + " characters.";
        }

        for (Pattern pattern : INPUT_BLOCK_PATTERNS) {
            if (pattern.matcher(message).find()) {
                log.warn("[Guardrail] Input blocked: prompt injection detected — pattern={}",
                        pattern.pattern().substring(0, Math.min(60, pattern.pattern().length())));
                return "I can help you with client retention and CRM-related questions. Could you rephrase your request?";
            }
        }

        return null; // safe
    }

    /**
     * Sanitizes AI output by redacting sensitive content and checking for
     * system prompt leakage.
     *
     * @return the sanitized response (never null)
     */
    public String sanitizeOutput(String response) {
        if (response == null || response.isBlank()) {
            return response;
        }

        String sanitized = response;

        // Redact credentials, internal URLs, tokens
        for (PatternReplacement pr : OUTPUT_REDACT_PATTERNS) {
            String before = sanitized;
            sanitized = pr.pattern.matcher(sanitized).replaceAll(pr.replacement);
            if (!before.equals(sanitized)) {
                log.warn("[Guardrail] Output redacted: pattern={}", pr.replacement);
            }
        }

        // Check for system prompt leakage
        for (Pattern pattern : SYSTEM_PROMPT_LEAK_PATTERNS) {
            if (pattern.matcher(sanitized).find()) {
                log.warn("[Guardrail] Output blocked: system prompt leakage detected");
                return "I can help you with client retention and CRM-related questions. What would you like to know?";
            }
        }

        return sanitized;
    }

    /**
     * Checks whether the user has exceeded the per-user rate limit.
     *
     * Uses Redis INCR + EXPIRE for a sliding-window counter.
     * Fail-open: if Redis is unavailable, the request is allowed.
     *
     * @return true if rate-limited (caller should reject), false if allowed
     */
    public boolean isRateLimited(UUID userId) {
        try {
            String key = RATE_LIMIT_KEY_PREFIX + userId;
            Long count = stringRedisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                stringRedisTemplate.expire(key, RATE_LIMIT_WINDOW);
            }
            if (count != null && count > RATE_LIMIT_MAX_MESSAGES) {
                log.warn("[Guardrail] Rate limit exceeded: userId={}, count={}", userId, count);
                return true;
            }
            return false;
        } catch (Exception e) {
            log.warn("[Guardrail] Rate limit check failed (fail-open): {}", e.getMessage());
            return false; // fail-open
        }
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private record PatternReplacement(Pattern pattern, String replacement) {}
}
