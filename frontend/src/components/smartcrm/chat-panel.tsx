"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import {
  RotateCcw,
  PanelRightClose,
  ArrowUp,
  Clock,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatbot } from "@/hooks/use-chatbot";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Which clients are most at risk of churning?",
  "What are the best retention strategies?",
  "How can I reduce churn for inactive clients?",
];

const MAX_MESSAGE_LENGTH = 4000;

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const {
    messages,
    isLoading,
    sendMessage,
    clearSession,
    sessionId,
    sessions,
    sessionsLoading,
    loadSessions,
    restoreSession,
  } = useChatbot();
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!showHistory) {
      inputRef.current?.focus();
    }
  }, [showHistory]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showHistory) {
          setShowHistory(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onClose, showHistory]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_MESSAGE_LENGTH) {
      setInput(value);
      e.target.style.height = "auto";
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    }
  };

  const handleOpenHistory = () => {
    setShowHistory(true);
    loadSessions();
  };

  const handleRestoreSession = (targetSessionId: string) => {
    restoreSession(targetSessionId);
    setShowHistory(false);
  };

  const handleNewChat = () => {
    clearSession();
    setShowHistory(false);
  };

  const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (showHistory) {
    return (
      <div
        ref={panelRef}
        className="flex h-full w-[440px] shrink-0 flex-col border-l border-border/40 bg-background"
        role="complementary"
        aria-label="Chat History"
      >
        <div className="flex h-12 items-center justify-between border-b border-border/40 px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(false)}
              className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
              aria-label="Back to chat"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-[13px] font-medium text-foreground">
              History
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
            title="Close panel"
            aria-label="Close panel"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="border-b border-border/40 px-3 py-2">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-2 rounded-xl border border-border/50 px-3 py-2.5 text-xs text-muted-foreground transition-all hover:border-border hover:bg-muted/40 hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
              </div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                No conversations yet
              </p>
            </div>
          ) : (
            <div className="flex flex-col py-1">
              {sessions.map((session) => (
                <button
                  key={session.sessionId}
                  onClick={() => handleRestoreSession(session.sessionId)}
                  className={cn(
                    "flex flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                    session.sessionId === sessionId && "bg-muted/50"
                  )}
                >
                  <p className="line-clamp-2 text-[13px] leading-snug text-foreground">
                    {session.firstMessage}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                    <span>{formatTimestamp(session.createdAt)}</span>
                    <span>·</span>
                    <span>
                      {session.messageCount}{" "}
                      {session.messageCount === 1 ? "message" : "messages"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="flex h-full w-[440px] shrink-0 flex-col border-l border-border/40 bg-background"
      role="complementary"
      aria-label="SmartCRM AI Assistant"
    >
      <div className="flex h-14 items-center justify-between border-b border-border/40 px-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium text-foreground">
            SmartCRM
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenHistory}
            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
            title="Chat history"
            aria-label="Chat history"
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            onClick={clearSession}
            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
            title="New conversation"
            aria-label="New conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
            title="Close panel"
            aria-label="Close panel"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center px-8">
            <div className="mb-4 h-16 w-16 overflow-hidden rounded-full">
              <Image src="/smartcrm-icon.png" alt="SmartCRM" width={64} height={64} className="h-full w-full object-cover" />
            </div>
            <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
              How can I help? Ask about client retention, churn risk, or account
              insights.
            </p>

            <div className="mt-6 flex w-full flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="w-full rounded-xl border border-border/50 px-4 py-3 text-left text-xs leading-relaxed text-muted-foreground transition-all hover:border-border hover:bg-muted/40 hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 px-4 py-5">
            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col">
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-muted px-4 py-2.5 text-base leading-relaxed text-foreground">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="mt-0.5 h-6 w-6 shrink-0 overflow-hidden rounded-full">
                      <Image src="/smartcrm-icon.png" alt="SmartCRM" width={24} height={24} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1 text-base leading-relaxed text-foreground">
                      <div className="chat-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full smartcrm-logo-bg">
                  <span className="text-xs smartcrm-logo">✺</span>
                </div>
                <div className="flex items-center gap-1 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="px-3 pb-3 pt-2">
        <div className="smartcrm-input-box rounded-2xl border px-3 py-2.5 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask SmartCRM..."
            rows={1}
            className="w-full resize-none bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            disabled={isLoading}
            aria-label="Message input"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground/50">
              AI may produce inaccurate info. Please double-check answers. 
            </p>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="smartcrm-send-btn flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-25"
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
