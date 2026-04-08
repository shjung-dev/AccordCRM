"use client";

import { useState, useCallback } from "react";
import { ChatFab } from "./chat-fab";
import { ChatPanel } from "./chat-panel";

interface ChatbotWrapperProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatbotWrapper({ isOpen, onToggle }: ChatbotWrapperProps) {
  return (
    <>
      <div
        className="overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{ width: isOpen ? 440 : 0 }}
      >
        {isOpen && <ChatPanel onClose={onToggle} />}
      </div>
      <ChatFab onClick={onToggle} isOpen={isOpen} />
    </>
  );
}
