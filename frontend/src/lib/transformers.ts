/**
 * Data transformation layer
 * Converts API DTOs to frontend UI types
 */

import type {
  ApiClient,
  ApiAccount,
  ApiTransaction,
  ApiActivityLog,
  Client,
  Transaction,
  ActivityLog,
  ActivityAction,
  EntityType,
  TransactionType,
  TransactionStatus,
  AccountType,
} from "@/types";

const VALID_ACCOUNT_TYPES = new Set<AccountType>(["Savings", "Checking", "Business"]);
const VALID_TRANSACTION_TYPES = new Set<TransactionType>(["deposit", "withdrawal", "transfer", "payment", "refund", "fee", "interest"]);
const VALID_TRANSACTION_STATUSES = new Set<TransactionStatus>(["completed", "pending", "failed", "reversed"]);
const VALID_ACTIVITY_ACTIONS = new Set<ActivityAction>([
  // Legacy generic actions
  "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "ACTIVATE", "DEACTIVATE", "APPROVE", "REJECT",
  // User actions
  "USER_CREATED", "USER_UPDATED", "USER_DELETED", "PASSWORD_RESET", "USER_AUTHENTICATED",
  // Client actions
  "CLIENT_CREATED", "CLIENT_UPDATED", "CLIENT_DELETED", "CLIENT_VIEWED",
  // Verification actions
  "CLIENT_VERIFICATION_STARTED", "CLIENT_VERIFICATION_PASSED", "CLIENT_VERIFICATION_FAILED", "CLIENT_VERIFICATION_REVIEWED",
  // Account actions
  "ACCOUNT_CREATED", "ACCOUNT_UPDATED", "ACCOUNT_DELETED", "ACCOUNT_VIEWED",
  // Communication actions
  "COMMUNICATION_CREATED", "COMMUNICATION_STATUS_CHECKED",
  // Transaction actions
  "TRANSACTIONS_IMPORTED", "TRANSACTION_VIEWED",
  // Failure actions
  "AUTH_FAILED", "VALIDATION_FAILED",
]);
const VALID_ENTITY_TYPES = new Set<EntityType>(["USER", "TRANSACTION", "CLIENT", "ACCOUNT", "REQUEST", "CASE"]);

function validateEnum<T extends string>(value: string, validSet: Set<T>, fallback: T): T {
  return validSet.has(value as T) ? (value as T) : fallback;
}

/**
 * Transform backend ApiClient + accounts to frontend Client type
 */
export function transformClient(
  apiClient: ApiClient,
  accounts: ApiAccount[] = []
): Client {
  const primaryAccount = accounts.find((a) => a.accountStatus === "Active") || accounts[0];
  const balance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const accountSummaries = accounts.map((account) => ({
    id: account.accountId,
    status: (account.accountStatus === "Active" ? "Active" : "Inactive") as "Active" | "Inactive",
    openedAt: account.createdAt || account.openingDate,
    balance: account.balance,
    currency: account.currency,
  }));

  let status: "active" | "inactive" | "pending" = "inactive";
  if (accounts.some((a) => a.accountStatus === "Active")) {
    status = "active";
  } else if (accounts.some((a) => a.accountStatus === "Pending")) {
    status = "pending";
  }

  const accountCount = accounts.length;

  return {
    id: apiClient.clientId,
    name: `${apiClient.firstName} ${apiClient.lastName}`,
    email: apiClient.emailAddress,
    phone: apiClient.phoneNumber,
    dateOfBirth: apiClient.dateOfBirth,
    accountCount,
    accounts: accountSummaries,
    balance,
    status,
    currency: primaryAccount?.currency,
    createdAt: apiClient.createdAt,
    assignedAgentId: apiClient.assignedAgentId,
    verified: apiClient.verifiedAt !== null,
    verificationMethod: apiClient.verificationMethod ?? null,
  };
}

/**
 * Transform backend ApiTransaction to frontend Transaction type
 */
export function transformTransaction(
  apiTxn: ApiTransaction,
  clientNameMap: Map<string, string> = new Map(),
  accountTypeMap: Map<string, string> = new Map()
): Transaction {
  const clientName = clientNameMap.get(apiTxn.clientId) || "Deleted Client";
  const accountType = accountTypeMap.get(apiTxn.accountId) || "Checking";
  const normalizedType =
    apiTxn.transactionType === "D"
      ? "deposit"
      : apiTxn.transactionType === "W"
        ? "withdrawal"
        : apiTxn.transactionType.toLowerCase();

  return {
    id: apiTxn.transactionId,
    clientId: apiTxn.clientId,
    clientName,
    accountId: apiTxn.accountId,
    accountType: validateEnum(accountType, VALID_ACCOUNT_TYPES, "Checking"),
    type: validateEnum(normalizedType, VALID_TRANSACTION_TYPES, "payment"),
    amount: apiTxn.amount,
    date: apiTxn.createdAt,
    status: validateEnum(apiTxn.status.toLowerCase(), VALID_TRANSACTION_STATUSES, "pending"),
    currency: apiTxn.currency,
    description: apiTxn.description,
  };
}

/**
 * Transform backend ApiActivityLog to frontend ActivityLog type
 */
export function transformActivityLog(apiLog: ApiActivityLog): ActivityLog {
  return {
    log_id: apiLog.logId,
    user_id: apiLog.userId,
    action: validateEnum(apiLog.action, VALID_ACTIVITY_ACTIONS, "UPDATE"),
    entity_type: validateEnum(apiLog.entityType, VALID_ENTITY_TYPES, "CLIENT"),
    entity_id: apiLog.entityId,
    attribute_name: apiLog.attributeName || null,
    before_value: apiLog.beforeValue || null,
    after_value: apiLog.afterValue || null,
    timestamp: apiLog.timestamp,
    action_status: apiLog.actionStatus,
    error_message: apiLog.errorMessage || null,
    reason: apiLog.reason || null,
    source_service: apiLog.sourceService,
  };
}

/**
 * Currency locale helper
 * Maps currency codes to locale strings for proper formatting
 */
export function getLocaleForCurrency(currency?: string): string {
  const localeMap: Record<string, string> = {
    SGD: "en-SG",
    USD: "en-US",
    EUR: "en-GB",
    GBP: "en-GB",
    JPY: "ja-JP",
    AUD: "en-AU",
    CNY: "zh-CN",
    HKD: "zh-HK",
    MYR: "ms-MY",
    INR: "en-IN",
  };

  return localeMap[currency || "SGD"] || "en-SG";
}
