import type {
  ApiClient,
  ApiAccount,
  ApiTransaction,
  ApiActivityLog,
} from "@/types";
import {
  transformClient,
  transformTransaction,
  transformActivityLog,
  getLocaleForCurrency,
} from "../transformers";

// ── helpers ─────────────────────────────────────────────────────────────

function makeApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    clientId: "c1",
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1990-01-15",
    gender: "Male",
    emailAddress: "john@example.com",
    phoneNumber: "+6512345678",
    address: "123 Street",
    city: "Singapore",
    state: "",
    country: "SG",
    postalCode: "123456",
    verifiedAt: "2024-01-01T00:00:00Z",
    verificationMethod: "manual",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
    deletedAt: null,
    assignedAgentId: "agent-1",
    ...overrides,
  };
}

function makeApiAccount(overrides: Partial<ApiAccount> = {}): ApiAccount {
  return {
    accountId: "acc-1",
    clientId: "c1",
    accountType: "savings",
    accountStatus: "Active",
    openingDate: "2024-01-01",
    balance: 1000,
    currency: "SGD",
    branchId: "branch-1",
    createdAt: "2024-01-01T00:00:00Z",
    verificationStatus: null,
    ...overrides,
  };
}

function makeApiTransaction(
  overrides: Partial<ApiTransaction> = {}
): ApiTransaction {
  return {
    transactionId: "txn-1",
    clientId: "c1",
    accountId: "acc-1",
    correlationId: null,
    idempotencyKey: "key-1",
    transactionType: "D",
    currency: "SGD",
    amount: 500,
    status: "Completed",
    description: "Deposit",
    createdAt: "2024-06-01T10:00:00Z",
    updatedAt: "2024-06-01T10:00:00Z",
    ...overrides,
  };
}

function makeApiActivityLog(
  overrides: Partial<ApiActivityLog> = {}
): ApiActivityLog {
  return {
    logId: "log-1",
    userId: "user-1",
    action: "UPDATE",
    entityType: "CLIENT",
    entityId: "entity-1",
    attributeName: "email",
    beforeValue: "old@x.com",
    afterValue: "new@x.com",
    timestamp: "2024-06-01T10:00:00Z",
    actionStatus: "SUCCESS",
    errorMessage: null,
    reason: null,
    sourceService: "crm",
    ...overrides,
  };
}

// ── transformClient ─────────────────────────────────────────────────────

describe("transformClient", () => {
  it("sets status to active when an account is Active", () => {
    const client = transformClient(makeApiClient(), [makeApiAccount()]);
    expect(client.status).toBe("active");
  });

  it("sets status to inactive when no accounts", () => {
    const client = transformClient(makeApiClient(), []);
    expect(client.status).toBe("inactive");
  });

  it("sets status to pending when only Pending accounts exist", () => {
    const client = transformClient(makeApiClient(), [
      makeApiAccount({ accountStatus: "Pending" }),
    ]);
    expect(client.status).toBe("pending");
  });

  it("sums balances across multiple accounts", () => {
    const accounts = [
      makeApiAccount({ balance: 100 }),
      makeApiAccount({ accountId: "acc-2", balance: 250 }),
    ];
    const client = transformClient(makeApiClient(), accounts);
    expect(client.balance).toBe(350);
  });

  it("concatenates first and last name", () => {
    const client = transformClient(
      makeApiClient({ firstName: "Jane", lastName: "Smith" }),
      []
    );
    expect(client.name).toBe("Jane Smith");
  });

  it("sets verified to true when verifiedAt is not null", () => {
    const client = transformClient(
      makeApiClient({ verifiedAt: "2024-01-01T00:00:00Z" }),
      []
    );
    expect(client.verified).toBe(true);
  });

  it("sets verified to false when verifiedAt is null", () => {
    const client = transformClient(
      makeApiClient({ verifiedAt: null }),
      []
    );
    expect(client.verified).toBe(false);
  });

  it("maps account summaries correctly", () => {
    const client = transformClient(makeApiClient(), [
      makeApiAccount({ accountId: "acc-1", accountStatus: "Active", balance: 500 }),
    ]);
    expect(client.accounts).toHaveLength(1);
    expect(client.accounts[0].id).toBe("acc-1");
    expect(client.accounts[0].status).toBe("Active");
    expect(client.accounts[0].balance).toBe(500);
  });

  it("sets accountCount to the number of accounts", () => {
    const client = transformClient(makeApiClient(), [
      makeApiAccount(),
      makeApiAccount({ accountId: "acc-2" }),
    ]);
    expect(client.accountCount).toBe(2);
  });
});

// ── transformTransaction ────────────────────────────────────────────────

describe("transformTransaction", () => {
  it('maps type "D" to "deposit"', () => {
    const txn = transformTransaction(makeApiTransaction({ transactionType: "D" }));
    expect(txn.type).toBe("deposit");
  });

  it('maps type "W" to "withdrawal"', () => {
    const txn = transformTransaction(makeApiTransaction({ transactionType: "W" }));
    expect(txn.type).toBe("withdrawal");
  });

  it('falls back to "payment" for unknown type', () => {
    const txn = transformTransaction(makeApiTransaction({ transactionType: "Z" }));
    expect(txn.type).toBe("payment");
  });

  it('uses "Deleted Client" when client is not in the map', () => {
    const txn = transformTransaction(makeApiTransaction());
    expect(txn.clientName).toBe("Deleted Client");
  });

  it("resolves client name from map", () => {
    const map = new Map([["c1", "Alice"]]);
    const txn = transformTransaction(makeApiTransaction(), map);
    expect(txn.clientName).toBe("Alice");
  });

  it('falls back invalid status to "pending"', () => {
    const txn = transformTransaction(makeApiTransaction({ status: "UNKNOWN" }));
    expect(txn.status).toBe("pending");
  });

  it("normalises valid status to lowercase", () => {
    const txn = transformTransaction(makeApiTransaction({ status: "Completed" }));
    expect(txn.status).toBe("completed");
  });

  it("preserves amount and currency", () => {
    const txn = transformTransaction(
      makeApiTransaction({ amount: 99.99, currency: "USD" })
    );
    expect(txn.amount).toBe(99.99);
    expect(txn.currency).toBe("USD");
  });
});

// ── transformActivityLog ────────────────────────────────────────────────

describe("transformActivityLog", () => {
  it("maps all fields correctly for a valid log", () => {
    const log = transformActivityLog(makeApiActivityLog());
    expect(log.log_id).toBe("log-1");
    expect(log.user_id).toBe("user-1");
    expect(log.action).toBe("UPDATE");
    expect(log.entity_type).toBe("CLIENT");
    expect(log.attribute_name).toBe("email");
    expect(log.before_value).toBe("old@x.com");
    expect(log.after_value).toBe("new@x.com");
  });

  it('falls back unknown action to "UPDATE"', () => {
    const log = transformActivityLog(
      makeApiActivityLog({ action: "CUSTOM_ACTION" })
    );
    expect(log.action).toBe("UPDATE");
  });

  it('falls back unknown entityType to "CLIENT"', () => {
    const log = transformActivityLog(
      makeApiActivityLog({ entityType: "WIDGET" })
    );
    expect(log.entity_type).toBe("CLIENT");
  });

  it("sets null optional fields when not provided", () => {
    const log = transformActivityLog(
      makeApiActivityLog({
        attributeName: null,
        beforeValue: null,
        afterValue: null,
        errorMessage: null,
        reason: null,
      })
    );
    expect(log.attribute_name).toBeNull();
    expect(log.before_value).toBeNull();
    expect(log.after_value).toBeNull();
    expect(log.error_message).toBeNull();
    expect(log.reason).toBeNull();
  });
});

// ── getLocaleForCurrency ────────────────────────────────────────────────

describe("getLocaleForCurrency", () => {
  it("returns en-SG for SGD", () => {
    expect(getLocaleForCurrency("SGD")).toBe("en-SG");
  });

  it("returns en-US for USD", () => {
    expect(getLocaleForCurrency("USD")).toBe("en-US");
  });

  it("returns ja-JP for JPY", () => {
    expect(getLocaleForCurrency("JPY")).toBe("ja-JP");
  });

  it('returns "en-SG" for undefined currency', () => {
    expect(getLocaleForCurrency(undefined)).toBe("en-SG");
  });

  it('returns "en-SG" for unknown currency', () => {
    expect(getLocaleForCurrency("XYZ")).toBe("en-SG");
  });
});
