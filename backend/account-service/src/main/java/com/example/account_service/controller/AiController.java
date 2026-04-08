package com.example.account_service.controller;

import com.example.account_service.dto.ChatHistoryEntry;
import com.example.account_service.dto.ChatRequest;
import com.example.account_service.dto.ChatResponse;
import com.example.account_service.dto.ChatSessionSummary;
import com.example.account_service.dto.RiskAssessmentResponse;
import com.example.account_service.model.RiskScoreRecord;
import com.example.account_service.security.AuthPrincipal;
import com.example.account_service.security.AuthUtil;
import com.example.account_service.service.AiChatService;
import com.example.account_service.service.RiskAssessmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final RiskAssessmentService riskAssessmentService;
    private final AiChatService aiChatService;

    /**
     * POST /api/ai/churn-risk/{clientId}
     *
     * Runs a Bedrock churn risk assessment for the given client.
     * Analyses all accounts and transactions, returns:
     *   - churn risk score (0–100)
     *   - risk level (LOW / MEDIUM / HIGH)
     *   - observed churn factors
     *   - recommended retention strategies
     *
     * Result is cached for 5 min (cache key = clientId).
     * Every call persists a record to the risk_score DynamoDB table.
     *
     * Access: rootAdmin and admin only.
     */
    @PostMapping("/churn-risk/{clientId}")
    ResponseEntity<RiskAssessmentResponse> assessChurnRisk(
            @PathVariable UUID clientId) {

        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isAgent()) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(riskAssessmentService.assessChurnRisk(clientId));
    }

    /**
     * GET /api/ai/churn-risk/{clientId}/history
     *
     * Returns the full history of churn risk assessments for a client from DynamoDB,
     * ordered most recent first (via client-id-index GSI).
     *
     * Access: rootAdmin and admin only.
     */
    @GetMapping("/churn-risk/{clientId}/history")
    ResponseEntity<List<RiskScoreRecord>> getChurnHistory(
            @PathVariable UUID clientId) {

        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isAgent()) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(riskAssessmentService.getHistory(clientId));
    }

    /**
     * POST /api/ai/chat
     *
     * Sends a message to the Client Retention AI Assistant.
     * Optionally attach an accountId for scoped account context in the prompt.
     * If a sessionId is provided, previous conversation history is included
     * for multi-turn context. Every interaction is audited to the
     * ai_chatbot_audit DynamoDB table.
     *
     * Access: agents only.
     */
    @PostMapping("/chat")
    ResponseEntity<ChatResponse> chat(
            @RequestBody @Valid ChatRequest chatRequest,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isAgent()) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(aiChatService.chat(chatRequest, principal.getUserId(), authHeader));
    }

    /**
     * GET /api/ai/chat/sessions
     *
     * Returns a summary list of all chat sessions for the current user.
     * Each entry contains the sessionId, first message preview, timestamp,
     * and message count. Used by the frontend to display conversation history.
     *
     * Access: agents only.
     */
    @GetMapping("/chat/sessions")
    ResponseEntity<List<ChatSessionSummary>> getChatSessions() {

        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isAgent()) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(aiChatService.getUserSessions(principal.getUserId()));
    }

    /**
     * GET /api/ai/chat/history/{sessionId}
     *
     * Returns the conversation history for a given session as a list of
     * user/assistant message entries, ordered chronologically.
     * Used by the frontend to restore a chat session on page refresh.
     *
     * Access: agents only.
     */
    @GetMapping("/chat/history/{sessionId}")
    ResponseEntity<List<ChatHistoryEntry>> getChatHistory(
            @PathVariable String sessionId) {

        AuthPrincipal principal = AuthUtil.requirePrincipal();
        if (!principal.isAgent()) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(aiChatService.getHistory(sessionId));
    }
}
