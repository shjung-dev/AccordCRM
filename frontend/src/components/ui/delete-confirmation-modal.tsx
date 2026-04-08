"use client";

import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import { useCallback, useEffect, useRef, useState } from "react";

const DELETION_REASONS = [
  "Client requested deletion",
  "Client is no longer active",
  "Client violated terms and conditions or rules",
];

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmWithReason?: (reason: string) => void;
  itemName: string;
  title?: string;
  consequences?: string[];
  isLoading?: boolean;
  confirmationWord?: string;
  showReasonSelection?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onConfirmWithReason,
  itemName,
  title,
  consequences,
  isLoading = false,
  confirmationWord = "delete",
  showReasonSelection = false,
}: DeleteConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState("");

  const hasValidReason = showReasonSelection
    ? selectedReason !== null &&
      (selectedReason !== "Other" || otherReason.trim().length > 0)
    : true;

  const isConfirmEnabled =
    inputValue.toLowerCase() === confirmationWord.toLowerCase() &&
    !isLoading &&
    hasValidReason;

  const selectReason = (reason: string) => {
    setSelectedReason(reason);
    if (reason !== "Other") {
      setOtherReason("");
    }
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => {
        setInputValue("");
        setSelectedReason(null);
        setOtherReason("");
        inputRef.current?.focus();
      }, 0);
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

  const displayTitle = title ?? `Delete ${itemName}`;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isLoading) {
      onClose();
    }
  };

  const buildReasonString = (): string => {
    if (selectedReason === "Other") return otherReason.trim();
    return selectedReason ?? "";
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isConfirmEnabled) return;

    if (showReasonSelection && onConfirmWithReason) {
      onConfirmWithReason(buildReasonString());
    } else {
      onConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        className="relative z-50 w-full max-w-2xl rounded-lg border bg-card shadow-lg"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3
            id="delete-modal-title"
            className="text-lg font-semibold text-foreground"
          >
            {displayTitle}
          </h3>
          <CloseButton onClick={onClose} disabled={isLoading} />
        </div>

        <div className="pb-8 pt-5 px-8">
          <div className="mb-4 text-center">
            <p className="text-2xl font-semibold text-foreground">{itemName}</p>
          </div>

          {consequences && consequences.length > 0 && (
            <ul className="mb-6 space-y-3">
              {consequences.map((consequence, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-base text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground" />
                  {consequence}
                </li>
              ))}
            </ul>
          )}

          {showReasonSelection && (
            <div className="mb-4">
              <p className="mb-2 text-sm text-muted-foreground font-medium">
                Select a reason for deletion:
              </p>
              <div className="space-y-2">
                {DELETION_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="deletion-reason"
                      checked={selectedReason === reason}
                      onChange={() => selectReason(reason)}
                      className="h-4 w-4 border-gray-300"
                    />
                    <span className="text-base font-medium">{reason}</span>
                  </label>
                ))}
                <label
                  className="flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="radio"
                    name="deletion-reason"
                    checked={selectedReason === "Other"}
                    onChange={() => selectReason("Other")}
                    className="h-4 w-4 border-gray-300"
                  />
                  <span className="text-sm font-medium">Other</span>
                </label>
                {selectedReason === "Other" && (
                  <input
                    type="text"
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="Enter reason for deletion"
                    className="w-full rounded-md border px-3 py-2 text-base bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  />
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="delete-confirmation-input"
              className="mb-3 block text-sm text-muted-foreground"
            >
              To confirm, type{" "}
              <span className="font-semibold text-foreground">
                {confirmationWord}
              </span>{" "}
              below:
            </label>
            <input
              ref={inputRef}
              id="delete-confirmation-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              className="mb-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={confirmationWord}
              autoComplete="off"
              spellCheck={false}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full bg-red-600 hover:cursor-pointer hover:bg-red-700 disabled:bg-red-300 disabled:opacity-100"
              disabled={!isConfirmEnabled}
            >
              {isLoading
                ? "Deleting..."
                : "I understand, delete this permanently"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
