import type { Client, TransactionStatus, TransactionType } from "@/types";

export const CLIENT_STATUS_STYLES: Record<Client["status"], string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  inactive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export const TRANSACTION_STATUS_STYLES: Record<TransactionStatus, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  reversed: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
  reversed: "Reversed",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer: "Transfer",
  payment: "Payment",
  refund: "Refund",
  fee: "Fee",
  interest: "Interest",
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  Savings: "Savings",
  Checking: "Checking",
  Business: "Business",
};

export const ACTION_STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  FAILURE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export const ACTION_STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Success",
  FAILURE: "Failed",
};

export const ACTION_STATUS_TEXT_STYLES: Record<string, string> = {
  SUCCESS: "text-green-600 dark:text-green-400",
  FAILURE: "text-destructive",
};
