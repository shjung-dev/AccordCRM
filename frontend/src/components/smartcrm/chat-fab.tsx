"use client";

import { Sparkles } from "lucide-react";

interface ChatFabProps {
  onClick: () => void;
  isOpen: boolean;
}

export function ChatFab({ onClick, isOpen }: ChatFabProps) {
  if (isOpen) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      title="Open SmartCRM"
      aria-label="Open SmartCRM"
    >
      <Sparkles className="h-5 w-5" />
    </button>
  );
}
