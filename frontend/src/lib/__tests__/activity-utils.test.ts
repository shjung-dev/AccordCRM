import type { ActivityLog } from "@/types";
import {
  groupActivityLogs,
  getActionText,
  getEntityDisplayName,
  getEntityIdLabel,
  getClientLink,
  getActivitySummaryPrefix,
  type GroupedActivityLog,
} from "../activity-utils";

// ── helper ──────────────────────────────────────────────────────────────

function makeLog(overrides: Partial<ActivityLog> = {}): ActivityLog {
  return {
    log_id: "log-1",
    user_id: "user-1",
    action: "UPDATE",
    entity_type: "CLIENT",
    entity_id: "client-1",
    attribute_name: null,
    before_value: null,
    after_value: null,
    timestamp: "2024-06-01T10:00:00Z",
    action_status: "SUCCESS",
    error_message: null,
    reason: null,
    source_service: "crm",
    ...overrides,
  };
}

// ── groupActivityLogs ───────────────────────────────────────────────────

describe("groupActivityLogs", () => {
  it("returns an empty array for empty input", () => {
    expect(groupActivityLogs([])).toEqual([]);
  });

  it("creates a single group for a single log without attribute", () => {
    const groups = groupActivityLogs([makeLog()]);
    expect(groups).toHaveLength(1);
    expect(groups[0].attributes).toEqual([]);
  });

  it("includes an attribute when attribute_name is set", () => {
    const log = makeLog({
      attribute_name: "email",
      before_value: "old@x.com",
      after_value: "new@x.com",
    });
    const groups = groupActivityLogs([log]);
    expect(groups[0].attributes).toHaveLength(1);
    expect(groups[0].attributes[0].attribute_name).toBe("email");
  });

  it("merges logs with the same key into one group", () => {
    const base = {
      entity_id: "client-1",
      action: "UPDATE" as const,
      timestamp: "2024-06-01T10:00:00Z",
    };
    const logs = [
      makeLog({ ...base, log_id: "log-1", attribute_name: "email", before_value: "a", after_value: "b" }),
      makeLog({ ...base, log_id: "log-2", attribute_name: "phone", before_value: "1", after_value: "2" }),
    ];
    const groups = groupActivityLogs(logs);
    expect(groups).toHaveLength(1);
    expect(groups[0].attributes).toHaveLength(2);
  });

  it("sorts groups newest-first", () => {
    const logs = [
      makeLog({ log_id: "old", timestamp: "2024-01-01T00:00:00Z" }),
      makeLog({ log_id: "new", timestamp: "2024-12-31T00:00:00Z", entity_id: "client-2" }),
    ];
    const groups = groupActivityLogs(logs);
    expect(groups[0].log_id).toBe("new");
    expect(groups[1].log_id).toBe("old");
  });

  it("does not push null attribute_name into attributes", () => {
    const logs = [
      makeLog({ attribute_name: "email", before_value: "a", after_value: "b" }),
      makeLog({ attribute_name: null }),
    ];
    const groups = groupActivityLogs(logs);
    expect(groups[0].attributes).toHaveLength(1);
  });
});

// ── getActionText ───────────────────────────────────────────────────────

describe("getActionText", () => {
  it("returns human-readable text for known actions", () => {
    expect(getActionText("CLIENT_CREATED")).toBe("Client Created");
    expect(getActionText("LOGIN")).toBe("Logged in");
    expect(getActionText("USER_UPDATED")).toBe("User Updated");
  });

  it("returns the raw input for unknown actions", () => {
    expect(getActionText("SOME_UNKNOWN")).toBe("SOME_UNKNOWN");
  });

  it("returns empty string for empty input", () => {
    expect(getActionText("")).toBe("");
  });
});

// ── getEntityDisplayName ────────────────────────────────────────────────

describe("getEntityDisplayName", () => {
  it("returns client name from map when available", () => {
    const map = new Map([["c1", "Alice"]]);
    expect(getEntityDisplayName("CLIENT", "c1", map)).toBe("Alice");
  });

  it('returns "Deleted Client" when client is not in the map', () => {
    const map = new Map<string, string>();
    expect(getEntityDisplayName("CLIENT", "c99", map)).toBe("Deleted Client");
  });

  it("returns user name from map when available", () => {
    const userMap = new Map([["u1", "Bob"]]);
    expect(getEntityDisplayName("USER", "u1", undefined, userMap)).toBe("Bob");
  });

  it('returns "Unknown User" when user is not in the map', () => {
    expect(getEntityDisplayName("USER", "u99")).toBe("Unknown User");
  });

  it("returns entityId for other entity types", () => {
    expect(getEntityDisplayName("ACCOUNT", "acc-1")).toBe("acc-1");
  });

  it("is case-insensitive on entity type", () => {
    const map = new Map([["c1", "Alice"]]);
    expect(getEntityDisplayName("client", "c1", map)).toBe("Alice");
    expect(getEntityDisplayName("Client", "c1", map)).toBe("Alice");
  });
});

// ── getEntityIdLabel ────────────────────────────────────────────────────

describe("getEntityIdLabel", () => {
  it("returns the label for known types", () => {
    expect(getEntityIdLabel("CLIENT")).toBe("Client");
    expect(getEntityIdLabel("USER")).toBe("User");
    expect(getEntityIdLabel("ACCOUNT")).toBe("Account");
    expect(getEntityIdLabel("TRANSACTION")).toBe("Transaction");
  });

  it('returns "ID" for unknown types', () => {
    expect(getEntityIdLabel("WIDGET")).toBe("ID");
    expect(getEntityIdLabel("")).toBe("ID");
  });
});

// ── getClientLink ───────────────────────────────────────────────────────

describe("getClientLink", () => {
  const grouped: GroupedActivityLog = {
    log_id: "l1",
    user_id: "u1",
    action: "UPDATE",
    entity_type: "CLIENT",
    entity_id: "c1",
    timestamp: "2024-01-01T00:00:00Z",
    action_status: "SUCCESS",
    error_message: null,
    reason: null,
    source_service: "crm",
    attributes: [],
  };

  it("returns entity_id when entity is a client and exists in the map", () => {
    const map = new Map([["c1", "Alice"]]);
    expect(getClientLink(grouped, map)).toBe("c1");
  });

  it("returns null when client is not in the map", () => {
    const map = new Map<string, string>();
    expect(getClientLink(grouped, map)).toBeNull();
  });

  it("returns null for non-client entity type", () => {
    const nonClient = { ...grouped, entity_type: "USER" };
    const map = new Map([["c1", "Alice"]]);
    expect(getClientLink(nonClient, map)).toBeNull();
  });

  it("returns null when no map is provided", () => {
    expect(getClientLink(grouped)).toBeNull();
  });
});

// ── getActivitySummaryPrefix ────────────────────────────────────────────

describe("getActivitySummaryPrefix", () => {
  const base: GroupedActivityLog = {
    log_id: "l1",
    user_id: "u1",
    action: "CLIENT_CREATED",
    entity_type: "CLIENT",
    entity_id: "c1",
    timestamp: "2024-01-01T00:00:00Z",
    action_status: "SUCCESS",
    error_message: null,
    reason: null,
    source_service: "crm",
    attributes: [],
  };

  it("returns the known prefix for a known action", () => {
    expect(getActivitySummaryPrefix(base)).toBe("Created a new client");
  });

  it("falls back to getActionText for unknown actions", () => {
    const unknown = { ...base, action: "SOME_UNKNOWN" };
    const result = getActivitySummaryPrefix(unknown);
    expect(result).toContain("SOME_UNKNOWN");
    expect(result).toContain("CLIENT");
  });

  it("includes entity type in the fallback", () => {
    const unknown = { ...base, action: "CUSTOM_ACTION", entity_type: "ACCOUNT" };
    const result = getActivitySummaryPrefix(unknown);
    expect(result).toContain("ACCOUNT");
  });
});
