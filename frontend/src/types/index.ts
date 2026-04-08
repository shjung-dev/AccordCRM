export type UserRole = "admin" | "agent";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  isRootAdmin: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  accountCount: number;
  accounts: {
    id: string;
    status: "Active" | "Inactive";
    openedAt: string;
    balance: number;
    currency: string;
  }[];
  balance: number;
  status: "active" | "inactive" | "pending";
  currency?: string;
  createdAt: string;
  assignedAgentId: string | null;
  verified: boolean;
  verificationMethod: string | null;
}

export interface DashboardStatistics {
  totalClients: number;
  activeAccounts: number;
  pendingRequests: number;
  totalBalance: number;
}

export type ActivityAction =
  // Legacy generic actions
  | "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "ACTIVATE" | "DEACTIVATE" | "APPROVE" | "REJECT"
  // User actions
  | "USER_CREATED" | "USER_UPDATED" | "USER_DELETED" | "PASSWORD_RESET" | "USER_AUTHENTICATED"
  // Client actions
  | "CLIENT_CREATED" | "CLIENT_UPDATED" | "CLIENT_DELETED" | "CLIENT_VIEWED"
  // Verification actions
  | "CLIENT_VERIFICATION_STARTED" | "CLIENT_VERIFICATION_PASSED" | "CLIENT_VERIFICATION_FAILED" | "CLIENT_VERIFICATION_REVIEWED"
  // Account actions
  | "ACCOUNT_CREATED" | "ACCOUNT_UPDATED" | "ACCOUNT_DELETED" | "ACCOUNT_VIEWED"
  // Communication actions
  | "COMMUNICATION_CREATED" | "COMMUNICATION_STATUS_CHECKED"
  // Transaction actions
  | "TRANSACTIONS_IMPORTED" | "TRANSACTION_VIEWED"
  // Failure actions
  | "AUTH_FAILED" | "VALIDATION_FAILED";
export type EntityType = "USER" | "TRANSACTION" | "CLIENT" | "ACCOUNT" | "REQUEST" | "CASE";
export type ActionStatus = "SUCCESS" | "FAILURE";

export interface ActivityLog {
  log_id: string;
  user_id: string;
  action: ActivityAction;
  entity_type: EntityType;
  entity_id: string;
  attribute_name: string | null;
  before_value: string | null;
  after_value: string | null;
  timestamp: string;
  action_status: ActionStatus;
  error_message: string | null;
  reason: string | null;
  source_service: string;
}

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "transfer"
  | "payment"
  | "refund"
  | "fee"
  | "interest";
export type TransactionStatus = "completed" | "pending" | "failed" | "reversed";
export type AccountType = "Savings" | "Checking" | "Business";

export interface Transaction {
  id: string;
  clientId: string;
  clientName: string;
  accountId: string;
  accountType: AccountType;
  type: TransactionType;
  amount: number;
  date: string;
  status: TransactionStatus;
  currency?: string;
  description?: string;
}

export interface ApiUser {
  userId: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string | null;
  isAdmin: boolean;
  isRootAdmin: boolean;
  createdAt: string;
}

export interface ApiClient {
  clientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  emailAddress: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  verifiedAt: string | null;
  verificationMethod: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  assignedAgentId: string | null;
  identificationNumber?: string;
}

export interface ApiAccount {
  accountId: string;
  clientId: string;
  accountType: string;
  accountStatus: string;
  openingDate: string;
  balance: number;
  currency: string;
  branchId: string;
  createdAt: string;
  verificationStatus: string | null;
}

export interface ApiTransaction {
  transactionId: string;
  clientId: string;
  accountId: string;
  correlationId: string | null;
  idempotencyKey: string;
  transactionType: string;
  currency: string;
  amount: number;
  status: string;
  description?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiActivityLog {
  logId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  attributeName?: string | null;
  beforeValue?: string | null;
  afterValue?: string | null;
  timestamp: string;
  actionStatus: ActionStatus;
  errorMessage?: string | null;
  reason?: string | null;
  sourceService: string;
}

// ── Request DTOs (matching backend validation contracts) ──

export interface ClientCreateRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date "YYYY-MM-DD"
  gender: string;
  emailAddress: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  assignedAgentId?: string;
  identificationNumber?: string;
}

export interface ClientUpdateRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  emailAddress?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  assignedAgentId?: string;
  identificationNumber?: string;
  verifiedAt?: string;
  verificationMethod?: string;
}

export interface AccountCreateRequest {
  clientId: string;
  accountType: string;
  accountStatus: string;
  openingDate: string; // ISO date "YYYY-MM-DD"
  balance: number;
  currency: string;
  branchId: string;
  verificationStatus?: string;
  assignedAgentId?: string;
}

export interface UserCreateRequest {
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
  isAdmin?: boolean;
}

export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  phoneNumber?: string;
  isAdmin?: boolean;
}

export interface ActivityLogCreateRequest {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  attributeName?: string;
  beforeValue?: string;
  afterValue?: string;
  timestamp?: string;
  actionStatus?: string;
  errorMessage?: string;
  reason?: string;
  sourceService?: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}