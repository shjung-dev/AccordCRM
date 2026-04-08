import { ApiClient } from "./client";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface ChatRequestPayload {
  message: string;
  sessionId?: string;
  accountId?: string;
}

export interface ChatResponsePayload {
  message: string;
  sessionId: string;
  modelUsed: string;
  cacheHit: boolean;
}

export interface ChatSessionSummary {
  sessionId: string;
  firstMessage: string;
  createdAt: string;
  messageCount: number;
}

export const chatApi = {
  async send(data: ChatRequestPayload): Promise<ChatResponsePayload> {
    return ApiClient.post("account", "/api/ai/chat", data);
  },

  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    return ApiClient.get("account", `/api/ai/chat/history/${sessionId}`);
  },

  async getSessions(): Promise<ChatSessionSummary[]> {
    return ApiClient.get("account", "/api/ai/chat/sessions");
  },
};
