# AccordCRM - CAP Theorem Analysis

## Overview

Brewer's CAP theorem states that a distributed system can only guarantee two of the following three properties simultaneously:

| Property | Definition |
|---|---|
| **C** — Consistency | Every read receives the most recent write. All nodes see the same data at the same time. |
| **A** — Availability | Every request receives a non-error response, without guarantee that it contains the most recent write. The system is always operational. |
| **P** — Partition Tolerance | The system continues to operate despite network partitions (message loss or delay between nodes). |

In any real-world distributed system, **network partitions are inevitable**. Therefore **P is always selected**, and the design decision reduces to choosing between:

- **CP (Consistency + Partition Tolerance)** — The system may become temporarily unavailable during a partition, but will never return stale or incorrect data. Suitable when correctness is non-negotiable.
- **AP (Availability + Partition Tolerance)** — The system always responds, even during a partition, but may return slightly stale data (eventual consistency). Suitable when uptime is more important than immediate accuracy.

> **Note:** Features that are purely frontend/presentational (Navigation & Layout, UI/UX Components, Data Formatting, Shared Utilities, Type Safety, Accessibility) do not involve distributed data storage and therefore do not have a meaningful CAP classification. They are excluded from this analysis.

---

## Summary Table

| # | Feature | CAP Pair | Priority |
|---|---|---|---|
| 1 | Authentication & Authorization | **CP** | Consistency over Availability |
| 2 | Agent Dashboard | **AP** | Availability over Consistency |
| 3 | Admin Dashboard | **AP** | Availability over Consistency |
| 4 | Client Profile Management | **CP** | Consistency over Availability |
| 5 | Transaction Management | **CP** | Consistency over Availability |
| 6 | Activity & Interaction Logging | **AP** | Availability over Consistency |
| 7 | Admin Agent Management | **CP** | Consistency over Availability |
| 8 | Settings & User Preferences | **AP** | Availability over Consistency |

---

## Detailed Analysis

### 1. Authentication & Authorization — CP (Consistency + Partition Tolerance)

**Selected Pair:** CP

**Rationale:**
Authentication is the security boundary of the entire system. The project requirements mandate OAuth 2.0, Zero Trust architecture, and that "all service requests must validate OAuth2-based token authenticity and authorization." If a partition occurs and one node has stale authentication data, the consequences are severe:

- A **disabled or deleted user** could continue to authenticate and access the system on a lagging node.
- A **role change** (e.g. agent demoted, admin permissions revoked) may not propagate, leading to unauthorized access.
- A **password reset** may not take effect, leaving a compromised credential valid.

In a banking CRM handling sensitive client and financial data, allowing unauthorized access — even briefly — is unacceptable. It is far safer for the system to become temporarily unavailable (rejecting login attempts) during a partition than to risk authenticating a revoked user.

**Trade-off accepted:** During a network partition, some legitimate users may be temporarily unable to log in. This is preferable to the security risk of inconsistent authentication state.

**Key requirements driving this decision:**
- Zero Trust security model (project_requirements.md, Section 3)
- OAuth 2.0 token validation on every request
- Root admin cannot be deleted — this invariant must be globally consistent
- Role-based route guards must reflect the true, current state of user permissions

---

### 2. Agent Dashboard — AP (Availability + Partition Tolerance)

**Selected Pair:** AP

**Rationale:**
The Agent Dashboard displays aggregated, read-only statistics (Total Clients, Accounts Opened, Transactions Today) and an activity timeline. This data is:

- **Derived/aggregated** — computed from underlying data stores, not authoritative itself.
- **Tolerant of staleness** — if the dashboard shows "42 clients" when the true count is 43, no business rule is violated and no incorrect action results.
- **Read-only** — no write operations originate from the dashboard, so there is no risk of conflicting writes.
- **Frequently accessed** — agents use the dashboard as their primary workspace entry point. If it is unavailable, agent productivity drops immediately.

An agent unable to see their dashboard is blocked from their entire workflow. A dashboard showing data that is a few seconds stale causes no harm.

**Trade-off accepted:** Dashboard statistics may lag behind the true state by a short window (eventual consistency). This is acceptable because the data is informational and non-authoritative.

**Key requirements driving this decision:**
- Frontend latency must not exceed 5 seconds (project_requirements.md, Section 5)
- System must support minimum 100 concurrent agents — high read concurrency favours AP
- Prioritize functionality and usability (project_requirements.md, Section 1)

---

### 3. Admin Dashboard — AP (Availability + Partition Tolerance)

**Selected Pair:** AP

**Rationale:**
The Admin Dashboard follows the same reasoning as the Agent Dashboard. It displays:

- Aggregated statistics (Total Agents, Total Clients)
- A recent agents table (read-only, limited to 3 entries)
- An activity timeline across all agents

All of this is read-only, aggregated, and informational. The admin needs continuous access to monitor the system. Temporary staleness in agent counts or the activity timeline does not lead to incorrect decisions — the admin is monitoring trends, not executing transactions.

**Trade-off accepted:** Admin overview data may be eventually consistent. An admin seeing "5 agents" when a 6th was just created moments ago does not compromise system integrity.

**Key requirements driving this decision:**
- Admins need to see activities of all agents (project_requirements.md, Section 2) — availability ensures this view is always accessible
- Dashboard is a monitoring tool, not a transactional system

---

### 4. Client Profile Management — CP (Consistency + Partition Tolerance)

**Selected Pair:** CP

**Rationale:**
Client Profile Management is the core data backbone of the CRM. The project requirements explicitly mandate:

- **ACID properties** on the Client Database (project_requirements.md, Section 4: "Client Database uses a relational database with ACID properties").
- **Uniqueness constraints** — Client ID must be unique across the system, email must be unique across the system, address must be unique across the system.
- **Data integrity** — "Validation checks and business rules are required to preserve data integrity."
- **Audit trails** — "Audit trails must track changes to client data."
- **Regulatory compliance** — data encryption at rest and in transit, GDPR right-to-erasure support.

If consistency is sacrificed during a partition:

- **Duplicate client profiles** could be created on different nodes with the same email or identification number, violating uniqueness constraints and potentially causing regulatory issues (e.g. duplicate KYC records).
- **A deleted client** (GDPR erasure) could still appear on a lagging node, violating data protection regulations.
- **Conflicting updates** — two agents on different nodes could update the same client simultaneously, leading to lost writes or corrupted data.
- **Verification status** could be inconsistent — a client might appear verified on one node and unverified on another, leading to agents taking actions on unverified clients.

In a banking context, incorrect client data can have legal, financial, and regulatory consequences.

**Trade-off accepted:** During a network partition, client creation/update/deletion may temporarily fail or be delayed. This is preferable to creating duplicate records, losing data, or violating regulatory requirements.

**Key requirements driving this decision:**
- ACID properties explicitly required (project_requirements.md, Section 4)
- Uniqueness constraints on Client ID, Email, Address
- GDPR right-to-erasure requires deletion to be globally consistent
- Audit trail integrity depends on consistent ordering of operations
- Data integrity and regulatory compliance are non-negotiable in banking

---

### 5. Transaction Management — CP (Consistency + Partition Tolerance)

**Selected Pair:** CP

**Rationale:**
Transaction Management handles financial data — deposits and withdrawals with monetary amounts and statuses. This is the most consistency-critical feature in the system. The consequences of inconsistency are directly financial:

- **Double processing** — a deposit or withdrawal could be applied twice on different nodes if they cannot communicate, leading to incorrect account balances.
- **Incorrect status** — a transaction marked as "Failed" on one node but "Completed" on another creates irreconcilable financial records. An agent might retry a transaction that actually succeeded, causing a double charge.
- **Amount discrepancies** — any inconsistency in transaction amounts directly translates to monetary loss or gain, which is a regulatory violation.
- **Audit failure** — financial regulators require exact, consistent, and auditable transaction records. Eventual consistency in transaction data would fail any compliance audit.

The system ingests transactions from an external SFTP source (core banking mainframe). This ingestion pipeline must be idempotent and consistent — processing the same transaction file on two nodes must not create duplicate records.

**Trade-off accepted:** During a network partition, transaction viewing and retry operations may be temporarily unavailable. This is far preferable to showing incorrect balances, double-processing transactions, or creating inconsistent financial records.

**Key requirements driving this decision:**
- High transaction volume with data integrity preservation (project_requirements.md, Section 1)
- Transaction status (Completed, Pending, Failed) must be authoritative — agents act on this status (e.g. retrying failed transactions)
- Currency amounts (SGD) must be exactly correct
- SFTP ingestion must be idempotent to prevent duplicate transaction records
- PCI-DSS compliance alignment requires accurate financial records (project_requirements.md, Section 8)
- Rollback mechanism for transaction failures (project_requirements.md, Section 5)

---

### 6. Activity & Interaction Logging — AP (Availability + Partition Tolerance)

**Selected Pair:** AP

**Rationale:**
Activity logs serve as the audit trail for the system. While audit integrity is important, the nature of logging makes AP the correct choice:

- **Append-only, immutable data** — logs are only ever written (appended), never updated or deleted. This eliminates the risk of conflicting writes. Two nodes independently appending logs will eventually converge to the same complete set without conflicts.
- **No log must be lost** — if the logging system becomes unavailable during a partition, log entries would be dropped entirely. This is worse than having logs appear with a slight delay. AP ensures that every action is always captured, even if it takes a moment to propagate to all nodes.
- **Logs are consumed asynchronously** — agents and admins browse logs for monitoring and auditing purposes. They do not make real-time decisions that depend on the log being perfectly up-to-the-millisecond consistent.
- **Ordering can be reconstructed** — each log entry carries an ISO 8601 timestamp. Even if entries arrive at different nodes in different orders, they can be sorted by timestamp to reconstruct the true order after the partition heals.

The project requirements state that "comprehensive monitoring and logging" is required (observability). Dropping logs during a partition would create blind spots in the audit trail, which is worse than temporary ordering inconsistency.

**Trade-off accepted:** During a network partition, a log entry written on Node A may not be immediately visible on Node B. After the partition heals, all logs converge to a complete, timestamp-ordered set. This brief visibility delay is acceptable.

**Key requirements driving this decision:**
- Audit trails must track changes to client data (project_requirements.md, Section 4) — availability ensures no audit event is ever lost
- Comprehensive monitoring and logging (project_requirements.md, Section 8.7)
- Logs are append-only and immutable — eventual consistency is safe for this data pattern
- ISO 8601 timestamps enable post-hoc ordering reconstruction

---

### 7. Admin Agent Management — CP (Consistency + Partition Tolerance)

**Selected Pair:** CP

**Rationale:**
Agent Management directly controls who has access to the system and what they can do. It is tightly coupled with authentication and authorization:

- **Disabling an agent** must take effect immediately and globally. If Node A disables an agent but Node B still considers them active, the disabled agent can continue accessing client data and performing transactions through Node B. This is a security breach.
- **Root admin protection** — the invariant "root admin cannot be deleted" must hold across all nodes. An inconsistent state where one node has deleted the root admin while another hasn't could leave the system in an irrecoverable state.
- **Creating new agents** involves assigning roles and permissions. An agent created on Node A but not yet visible on Node B could be denied access, which is merely inconvenient. But an agent deleted on Node A but still active on Node B is a security risk. CP correctly prioritizes preventing the dangerous case.

This feature is low-traffic (agent management happens infrequently) but high-impact (each operation directly affects system security). The availability cost of CP is minimal because these operations are rare.

**Trade-off accepted:** During a network partition, agent creation/modification/deletion may be temporarily blocked. Given that these are infrequent administrative operations, the availability impact is negligible, while the security benefit of consistency is critical.

**Key requirements driving this decision:**
- Role-based access control must be authoritative (project_requirements.md, Section 2)
- Root admin cannot be deleted — a globally enforced invariant
- Zero Trust security requires that access state is never stale
- Agent operations are low-frequency, making the availability trade-off minimal

---

### 8. Settings & User Preferences — AP (Availability + Partition Tolerance)

**Selected Pair:** AP

**Rationale:**
User settings in AccordCRM consist of display preferences (dark/light theme) and read-only profile information. This is the lowest-stakes data in the system:

- **Theme preference** — if a user's theme choice (dark mode) is temporarily inconsistent across sessions or nodes, the only consequence is a visual inconvenience. No data is lost, no security is compromised, no business rule is violated.
- **Profile information is read-only** — the settings page displays the user's name, email, role, and ID. These are read from the authoritative user store (which is CP under Authentication). The settings page is merely a view.
- **Per-user scope** — preferences are scoped to a single user. There is no cross-user dependency, no shared state, and no conflict risk.

Blocking a user from accessing their settings during a partition provides no benefit. The data is non-critical, per-user, and non-conflicting.

**Trade-off accepted:** A user's theme preference may briefly be inconsistent if they change it during a partition. This is entirely harmless.

**Key requirements driving this decision:**
- Usability: "intuitive and accessible UI" (project_requirements.md, Section 8.6) — the settings page should always be accessible
- Preferences are non-critical, per-user, non-conflicting data
- No business logic depends on theme or display settings

---

## Design Decision Matrix

| Factor | Favours CP | Favours AP |
|---|---|---|
| Financial data (money, balances) | Yes | |
| Security / access control | Yes | |
| Uniqueness constraints | Yes | |
| Regulatory compliance (GDPR, PCI-DSS) | Yes | |
| ACID requirements | Yes | |
| Read-only / aggregated data | | Yes |
| Append-only / immutable data | | Yes |
| High-frequency reads, low-frequency writes | | Yes |
| User-facing latency sensitivity | | Yes |
| Non-critical / per-user data | | Yes |
| Data that can be reconstructed from timestamps | | Yes |

---

## Architectural Implications

### For CP Features (Auth, Clients, Transactions, Agent Management)
- Use a **strongly consistent database** (e.g. PostgreSQL with synchronous replication, or a CP-oriented distributed database like CockroachDB or Google Spanner).
- Implement **distributed locks or consensus protocols** for operations requiring uniqueness (client creation, transaction processing).
- Accept **higher write latency** during partitions in exchange for correctness.
- Design **retry-with-backoff** on the frontend for temporarily unavailable write operations.

### For AP Features (Dashboards, Logging, Settings)
- Use **eventually consistent read replicas** for dashboard queries to reduce load on the primary.
- Use a **write-optimized, append-only store** for activity logs (e.g. Amazon DynamoDB, Apache Kafka, or an eventually consistent log aggregation pipeline).
- **Cache aggressively** — dashboard data and settings can be served from cache even if the cache is slightly stale.
- Use **local-first storage** for user preferences (localStorage, as currently implemented) with background sync.
