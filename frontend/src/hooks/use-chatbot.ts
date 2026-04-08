"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  chatApi,
  type ChatMessage,
  type ChatSessionSummary,
} from "@/lib/api/chat";

const SESSION_KEY = "accordcrm_chat_session_id";

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const restoredRef = useRef(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;

    setSessionId(stored);
    chatApi
      .getHistory(stored)
      .then((history) => {
        if (history.length > 0) {
          setMessages(history);
        } else {
          // Session exists but no history — clear stale session
          localStorage.removeItem(SESSION_KEY);
          setSessionId(null);
        }
      })
      .catch(() => {
        // History fetch failed — start fresh
        localStorage.removeItem(SESSION_KEY);
        setSessionId(null);
      });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const response = await chatApi.send({
          message: trimmed,
          sessionId: sessionId ?? undefined,
        });

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: response.message,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Persist session ID
        if (!sessionId) {
          setSessionId(response.sessionId);
          localStorage.setItem(SESSION_KEY, response.sessionId);
        }
      } catch {
        const errorMsg: ChatMessage = {
          role: "assistant",
          content:
            "Sorry, I'm unable to respond right now. Please try again later.",
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading]
  );

  const clearSession = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await chatApi.getSessions();
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const restoreSession = useCallback(async (targetSessionId: string) => {
    try {
      const history = await chatApi.getHistory(targetSessionId);
      if (history.length > 0) {
        setMessages(history);
        setSessionId(targetSessionId);
        localStorage.setItem(SESSION_KEY, targetSessionId);
      }
    } catch {
      // Silently fail — user stays on current session
    }
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearSession,
    sessionId,
    sessions,
    sessionsLoading,
    loadSessions,
    restoreSession,
  };
}
