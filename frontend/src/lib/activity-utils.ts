import type { ActivityLog } from "@/types";

export interface GroupedActivityLog {
  log_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  action_status: string;
  error_message: string | null;
  reason: string | null;
  source_service: string;
  attributes: {
    attribute_name: string;
    before_value: string | null;
    after_value: string | null;
  }[];
}

export function groupActivityLogs(logs: ActivityLog[]): GroupedActivityLog[] {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const groups: GroupedActivityLog[] = [];
  const seen = new Set<string>();

  for (const log of sorted) {
    const key = `${log.entity_id}|${log.action}|${log.timestamp}`;

    if (seen.has(key)) {
      const existing = groups.find(
        (g) =>
          g.entity_id === log.entity_id &&
          g.action === log.action &&
          g.timestamp === log.timestamp
      );
      if (existing && log.attribute_name) {
        existing.attributes.push({
          attribute_name: log.attribute_name,
          before_value: log.before_value,
          after_value: log.after_value,
        });
      }
      continue;
    }

    seen.add(key);
    const grouped: GroupedActivityLog = {
      log_id: log.log_id,
      user_id: log.user_id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      timestamp: log.timestamp,
      action_status: log.action_status,
      error_message: log.error_message,
      reason: log.reason,
      source_service: log.source_service,
      attributes: [],
    };

    if (log.attribute_name) {
      grouped.attributes.push({
        attribute_name: log.attribute_name,
        before_value: log.before_value,
        after_value: log.after_value,
      });
    }

    groups.push(grouped);
  }
  return groups;
}

const ACTION_TEXT: Record<string, string> = {
  // Admin/Agent actions
  USER_CREATED: "User Created",
  USER_DELETED: "User Deleted",
  USER_UPDATED: "User Updated",
  PASSWORD_RESET: "Password Reset",
  USER_AUTHENTICATED: "User Authenticated",

  // Client actions
  CLIENT_CREATED: "Client Created",
  CLIENT_UPDATED: "Client Updated",
  CLIENT_DELETED: "Client Deleted",
  CLIENT_VIEWED: "Client Viewed",

  // Verification actions
  CLIENT_VERIFICATION_STARTED: "Verification Started",
  CLIENT_VERIFICATION_PASSED: "Verification Passed",
  CLIENT_VERIFICATION_FAILED: "Verification Failed",
  CLIENT_VERIFICATION_REVIEWED: "Verification Reviewed",

  // Account actions
  ACCOUNT_CREATED: "Account Created",
  ACCOUNT_UPDATED: "Account Updated",
  ACCOUNT_DELETED: "Account Deleted",
  ACCOUNT_VIEWED: "Account Viewed",

  // Communication actions
  COMMUNICATION_CREATED: "Communication Sent",
  COMMUNICATION_STATUS_CHECKED: "Communication Status Checked",

  // Transaction actions
  TRANSACTIONS_IMPORTED: "Transactions Imported",
  TRANSACTION_VIEWED: "Transaction Viewed",

  // Failure actions
  AUTH_FAILED: "Authentication Failed",
  VALIDATION_FAILED: "Validation Failed",

  // Legacy generic actions
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  LOGIN: "Logged in",
  LOGOUT: "Logged out",
  ACTIVATE: "Activated",
  DEACTIVATE: "Deactivated",
  APPROVE: "Approved",
  REJECT: "Rejected",
};

export function getActionText(action: string): string {
  return ACTION_TEXT[action] || action;
}

export function getEntityDisplayName(
  entityType: string,
  entityId: string,
  clientMap?: Map<string, string>,
  userNameMap?: Map<string, string>,
  accountClientMap?: Map<string, string>
): string {
  const type = entityType.toLowerCase();
  if (type === "client") {
    if (clientMap?.has(entityId)) {
      return clientMap.get(entityId) ?? entityId;
    }
    return "Deleted Client";
  }
  if (type === "user") {
    if (userNameMap?.has(entityId)) {
      return userNameMap.get(entityId) ?? entityId;
    }
    return "Unknown User";
  }
  if (type === "account") {
    if (accountClientMap?.has(entityId)) {
      return accountClientMap.get(entityId) ?? entityId;
    }
    return entityId;
  }
  return entityId;
}

export function getEntityIdLabel(entityType: string): string {
  const labels: Record<string, string> = {
    CLIENT: "Client",
    USER: "User",
    ACCOUNT: "Account",
    TRANSACTION: "Transaction",
    REQUEST: "Request",
    CASE: "Case",
  };
  return labels[entityType] || "ID";
}

export function formatFullTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export function getClientLink(
  item: GroupedActivityLog,
  clientMap?: Map<string, string>
): string | null {
  if (item.entity_type.toLowerCase() === "client" && clientMap?.has(item.entity_id)) {
    return item.entity_id;
  }
  return null;
}

const ACTION_SUMMARY_PREFIX: Record<string, string> = {
  // Admin/Agent actions
  USER_CREATED: "Created a new user",
  USER_DELETED: "Deleted user",
  USER_UPDATED: "Updated user details for",
  PASSWORD_RESET: "Reset password for",
  USER_AUTHENTICATED: "User authenticated",

  // Client actions
  CLIENT_CREATED: "Created a new client",
  CLIENT_UPDATED: "Updated client details for",
  CLIENT_DELETED: "Deleted client",
  CLIENT_VIEWED: "Viewed client",

  // Verification actions
  CLIENT_VERIFICATION_STARTED: "Started verification for",
  CLIENT_VERIFICATION_PASSED: "Verification passed for",
  CLIENT_VERIFICATION_FAILED: "Verification failed for",
  CLIENT_VERIFICATION_REVIEWED: "Reviewed verification for",

  // Account actions
  ACCOUNT_CREATED: "Created a new account",
  ACCOUNT_UPDATED: "Updated account",
  ACCOUNT_DELETED: "Deleted account",
  ACCOUNT_VIEWED: "Viewed account",

  // Communication actions
  COMMUNICATION_CREATED: "Sent a communication",
  COMMUNICATION_STATUS_CHECKED: "Checked communication status",

  // Transaction actions
  TRANSACTIONS_IMPORTED: "Imported transactions",
  TRANSACTION_VIEWED: "Viewed transaction",
  // Failure actions
  AUTH_FAILED: "Authentication failed for",
  VALIDATION_FAILED: "Validation failed for",

  // Legacy generic actions
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
};

export function getActivitySummaryPrefix(item: GroupedActivityLog): string {
  const prefix = ACTION_SUMMARY_PREFIX[item.action];
  if (prefix) return prefix;
  return `${getActionText(item.action)} ${item.entity_type}`;
}
