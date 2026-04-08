"use client";


import {
  TRANSACTION_STATUS_STYLES,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  ACCOUNT_TYPE_LABELS,
} from "@/lib/constants";
import { toast } from "sonner";
import type { Transaction } from "@/types";
import { useState, useCallback } from "react";
import { useDrawer } from "@/hooks/use-drawer";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ArrowDownCircle, ArrowUpCircle, RotateCcw } from "lucide-react";

interface TransactionDetailsDrawerProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function TransactionDetailsDrawer({
  transaction,
  onClose,
}: TransactionDetailsDrawerProps) {
  const { isOpen: isDrawerOpen, isVisible: isDrawerVisible, close: handleClose } = useDrawer(transaction, onClose);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    if (!transaction) return;

    setIsRetrying(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRetrying(false);
    toast.success(`Transaction ${transaction.id} has been queued for retry.`);
    handleClose();
  }, [transaction, handleClose]);

  if (!isDrawerVisible || !transaction) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${
          isDrawerOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-card border-l rounded-tl-lg rounded-bl-lg shadow-lg z-50 overflow-y-auto transform transition-transform duration-300 ease-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 bg-card border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Transaction Details</h2>
            <button
              type="button"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-full ${
                transaction.type === "deposit"
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
              }`}
            >
              {transaction.type === "deposit" ? (
                <ArrowDownCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <ArrowUpCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <p className="text-xl font-semibold">
                {formatCurrency(transaction.amount, "en-SG", "SGD")}
              </p>
              <p className="text-sm text-muted-foreground">
                {TRANSACTION_TYPE_LABELS[transaction.type]}
              </p>
            </div>
            <span
              className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TRANSACTION_STATUS_STYLES[transaction.status]}`}
            >
              {TRANSACTION_STATUS_LABELS[transaction.status]}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm text-muted-foreground">
                Transaction ID
              </span>
              <span className="text-sm font-medium">
                {transaction.id}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm text-muted-foreground">Client Name</span>
              <span className="text-sm font-medium">
                {transaction.clientName}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm text-muted-foreground">Client ID</span>
              <span className="text-sm">{transaction.clientId}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm text-muted-foreground">Account ID</span>
              <span className="text-sm">{transaction.accountId}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm text-muted-foreground">Account Type</span>
              <span className="text-sm font-medium">
                {ACCOUNT_TYPE_LABELS[transaction.accountType]}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm text-muted-foreground">Date & Time</span>
              <span className="text-sm font-medium">
                {formatDate(
                  transaction.date,
                  { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" },
                  "en-GB"
                )}
              </span>
            </div>
          </div>

          {transaction.description && (
            <div>
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {transaction.description}
              </p>
            </div>
          )}

          {transaction.status === "failed" && (
            <div className="pt-2">
              <Button
                className="w-full"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                <RotateCcw
                  className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`}
                />
                {isRetrying ? "Retrying..." : "Retry Transaction"}
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
