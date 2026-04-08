"use client";

import { useState, useEffect, useCallback } from "react";

export function useDrawer(data: unknown, onClose: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const isVisible = !!data;

  useEffect(() => {
    if (data) {
      requestAnimationFrame(() => {
        setIsOpen(true);
      });
    }
  }, [data]);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, close]);

  return { isOpen, isVisible, close };
}
