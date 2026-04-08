"use client";

import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef } from "react";
import { CloseButton } from "@/components/ui/close-button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const confirmButtonClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 hover:cursor-pointer"
      : variant === "warning"
        ? "bg-yellow-600 hover:bg-yellow-700 hover:cursor-pointer"
        : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        className="relative z-50 w-full max-w-md rounded-lg border bg-card shadow-lg"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3
            id="confirmation-modal-title"
            className="text-lg font-semibold text-foreground"
          >
            {title}
          </h3>
          <CloseButton onClick={onClose} />
        </div>

        <div className="p-6">
          <p className="text-sm text-muted-foreground">{message}</p>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} className="hover:cursor-pointer">
              {cancelLabel}
            </Button>
            <Button className={confirmButtonClass} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
