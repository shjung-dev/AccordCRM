package com.example.account_service.tool;

/**
 * A tool the AI assistant can invoke during a chat conversation.
 * Each tool has a name, description (for the system prompt), and an execute method.
 */
public interface ChatTool {
    /** Tool name used in [TOOL_CALL: name | params] */
    String name();

    /** One-line description included in the system prompt */
    String description();

    /** Execute the tool and return a textual result for the AI to interpret */
    String execute(String params);
}
