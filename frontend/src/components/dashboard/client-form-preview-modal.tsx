"use client";

import { Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo } from "react";
import { CloseButton } from "@/components/ui/close-button";
import { getFormPreviewHtml, downloadClientApplicationForm } from "@/lib/generate-client-form";

interface ClientFormPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClientFormPreviewModal({
  isOpen,
  onClose,
}: ClientFormPreviewModalProps) {
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

  const previewHtml = useMemo(() => getFormPreviewHtml(), []);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleDownload = () => {
    downloadClientApplicationForm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-preview-title"
    >
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      <div className="relative z-50 flex h-[90vh] w-full max-w-4xl flex-col rounded-lg border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <h3
            id="form-preview-title"
            className="text-lg font-semibold text-foreground"
          >
            Client Application Form Preview
          </h3>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => {}}>
              <Send className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button onClick={handleDownload} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <CloseButton onClick={onClose} />
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          <iframe
            srcDoc={previewHtml}
            className="h-full w-full border-1 py-12"
            title="Client Application Form Preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
