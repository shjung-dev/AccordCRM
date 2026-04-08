# AccordCRM — Use Case Report

**Project:** AccordCRM (Customer Relationship Management System)  
**Date:** 5 April 2026  
**Version:** 1.0  
**Prepared by:** DevOps-deployment branch analysis  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Use Case 1 — Agent Onboards a New Client](#2-use-case-1--agent-onboards-a-new-client)
3. [Use Case 2 — Agent Opens a Bank Account for a Client](#3-use-case-2--agent-opens-a-bank-account-for-a-client)
4. [Use Case 3 — Admin Removes an Agent with Client Reassignment](#4-use-case-3--admin-removes-an-agent-with-client-reassignment)
5. [Use Case 4 — Automated Transaction Ingestion via SFTP](#5-use-case-4--automated-transaction-ingestion-via-sftp)
6. [Use Case 5 — Agent Uses SmartCRM AI Chatbot for Client Analysis](#6-use-case-5--agent-uses-smartcrm-ai-chatbot-for-client-analysis)
7. [Use Case 6 — Root Admin Onboards a New Admin](#7-use-case-6--root-admin-onboards-a-new-admin)
8. [Use Case 7 — Agent Verifies a Client's Identity](#8-use-case-7--agent-verifies-a-clients-identity)
9. [Use Case 8 — Admin Reviews Transactions and Audit Logs for Compliance](#9-use-case-8--admin-reviews-transactions-and-audit-logs-for-compliance)
10. [AWS Service Dependency Matrix](#10-aws-service-dependency-matrix)

---

## 1. System Overview

AccordCRM is a microservices-based banking CRM deployed on AWS. It enables relationship managers (agents) to manage clients and accounts, while administrators oversee operations and compliance. The system consists of three backend services, a Next.js frontend, and supporting serverless infrastructure.

### Architecture Summary

| Layer | Component | Technology |
|-------|-----------|------------|
| Frontend | Web Application | Next.js 16 (App Router), React 19, Tailwind CSS |
| API Gateway | Proxy + Auth | Next.js API routes, Cognito JWT validation, CSRF protection |
| Backend | User Service | Spring Boot 4, PostgreSQL (port 8081) |
| Backend | Client Service | Spring Boot 4, PostgreSQL (port 8082) |
| Backend | Account & Transaction Service | Spring Boot 4, PostgreSQL (port 8083) |
| Compute | Container Orchestration | ECS Fargate (2 AZs) |
| Networking | Load Balancer | Application Load Balancer (ALB) with path-based routing |
| Auth | Identity Provider | AWS Cognito (User Pool with agent/admin/root_admin groups) |
| AI | Language Model | AWS Bedrock (Claude) |
| Messaging | Async Processing | SQS (log queue + email queue) with DLQs |
| Storage | Audit & AI Data | DynamoDB (log, risk-score, ai-chatbot-audit tables) |
| Caching | Query Performance | ElastiCache (Redis) — 3 clusters |
| Email | Client Notifications | SES (branded HTML templates) |
| Data Ingestion | File Transfer | AWS Transfer Family (SFTP) + S3 + EventBridge |
| Serverless | Event Processing | Lambda (log processor, email sender, SFTP initiator, SFTP processor) |

### Role Hierarchy

| Role | Permissions |
|------|------------|
| **Agent** | Manage own clients, create accounts, view own transactions, use AI chatbot |
| **Admin** | View all clients/transactions, manage agents, view audit logs |
| **Root Admin** | Full system access, create/delete admins, system-wide audit visibility |

---

## 2. Use Case 1 — Agent Onboards a New Client

### Scenario

A relationship manager (agent) meets a prospective customer at the branch. The customer provides personal details and identification. The agent registers them in AccordCRM, which triggers a welcome email and creates an audit trail.

### Actors

- **Primary:** Agent (relationship manager)
- **Secondary:** Client (receives email), System (audit logging)

### Preconditions

- Agent has an active account in Cognito with the `agent` group membership.
- Agent is authenticated and has a valid session.

### User Flow

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Agent navigates to `/login/agent` and enters email + password | Cognito validates credentials and returns access + refresh tokens. Next.js creates a session cookie and fetches the user record from User Service. Agent is redirected to `/agent`. |
| 2 | Agent clicks "Create Client" on the dashboard | Browser navigates to `/agent/clients/new`. Form loads with fields for personal details, address, and identification. |
| 3 | Agent fills in all required fields: first name, last name, date of birth, gender, email, phone number, identification number, address, city, state, country, postal code | Client-side validation runs: email format, age between 18–100, phone format (`+?[0-9]{8,15}`), postal code by country, address length (5–100 chars). |
| 4 | Agent submits the form | Frontend sends `POST /api/clients` to Client Service. The `assignedAgentId` is automatically set to the authenticated agent's user ID. |
| 5 | Agent sees the new client's profile page | Browser redirects to `/agent/clients/{clientId}`. Client details are displayed with a "Unverified" status badge. |

### API Path Sequence

| Order | Method | Path | Target Service | Purpose |
|-------|--------|------|----------------|---------|
| 1 | `POST` | `/api/auth/login` | Next.js → Cognito → User Service | Authenticate agent, issue session |
| 2 | `GET` | `/api/auth/session` | Next.js | Verify session on page load |
| 3 | `POST` | `/api/proxy/client/api/clients` | Client Service (8082) | Create client record |
| 4 | `GET` | `/api/proxy/client/api/clients/{clientId}` | Client Service (8082) | Load newly created client |

### Background Processing (Event-Driven)

| Trigger | Service | Action |
|---------|---------|--------|
| Client creation publishes to SQS email queue | Lambda (email sender) | Polls queue, builds branded HTML "WELCOME" email, sends via SES to client's email address |
| Client creation publishes to SQS log queue | Lambda (log processor) | Polls queue, writes `CLIENT_CREATED` audit entry to DynamoDB log table |
| Cache eviction | ElastiCache (Redis) | Agent's client list cache (`clients-by-agent`) is invalidated |

### AWS Services Involved

| Service | Role |
|---------|------|
| **Cognito** | Authenticates agent, validates JWT, manages session tokens |
| **ECS Fargate** | Runs Client Service container |
| **ALB** | Routes `/api/clients` to Client Service target group |
| **RDS (client_db)** | Stores client record with all fields and constraints |
| **SQS (email-queue)** | Buffers email request for async processing |
| **SQS (log-queue)** | Buffers audit log for async processing |
| **Lambda (email sender)** | Processes email queue, renders HTML template |
| **Lambda (log processor)** | Processes log queue, writes to DynamoDB |
| **SES** | Delivers welcome email to client |
| **DynamoDB (accord-crm-log)** | Stores `CLIENT_CREATED` audit record |
| **ElastiCache** | Invalidates cached client lists |

### Postconditions

- Client record exists in `client_db.clients` with `assigned_agent_id` set to the agent's UUID.
- `CLIENT_CREATED` audit log stored in DynamoDB with userId, entityId, and timestamp.
- Client receives a branded welcome email via SES.
- Agent's client list cache is evicted so subsequent queries reflect the new client.

### Database Record Created

```
clients table:
  client_id:             UUID (auto-generated)
  first_name:            "Liam"
  last_name:             "Tan"
  date_of_birth:         1985-03-15
  gender:                "Male"
  email_address:         "liam.tan@email.com"
  phone_number:          "+6581000001"
  address:               "10 Orchard Road #05-01"
  city:                  "Singapore"
  state:                 "Central"
  country:               "Singapore"
  postal_code:           "238826"
  identification_number: "S8503151A"
  assigned_agent_id:     <agent's UUID>
  verified_at:           NULL
  verification_method:   NULL
  deleted_at:            NULL
  created_at:            NOW()
  updated_at:            NOW()
```

---

## 3. Use Case 2 — Agent Opens a Bank Account for a Client

### Scenario

An existing client requests a new Savings account. The assigned agent creates the account in AccordCRM, which links it to the client, sends a confirmation email with account details, and logs the action.

### Actors

- **Primary:** Agent
- **Secondary:** Client (receives email), System (audit logging, cross-service validation)

### Preconditions

- Agent is authenticated with a valid session.
- Client exists in the system and is assigned to the agent.
- Client has not been soft-deleted.

### User Flow

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Agent navigates to `/agent/clients/{clientId}` | Frontend fetches client details from Client Service and accounts from Account Service. Client profile and existing accounts are displayed. |
| 2 | Agent clicks "Create Account" | Modal or form opens with fields: account type, account status, currency, opening balance, branch ID. |
| 3 | Agent selects account type "Savings", status "Active", currency "SGD", enters balance "15000.00" | Client-side validation: balance >= 0, currency is 3-letter uppercase ISO code, account type is one of Savings/Checking/Business. |
| 4 | Agent submits the form | Frontend sends `POST /api/accounts` to Account Service. Server-side: Account Service calls Client Service to verify the agent owns this client. Account is created and linked to both the client and agent. |
| 5 | Agent sees the new account in the client's account list | Account list refreshes showing the new Savings account with balance SGD 15,000.00. |

### API Path Sequence

| Order | Method | Path | Target Service | Purpose |
|-------|--------|------|----------------|---------|
| 1 | `GET` | `/api/proxy/client/api/clients/{clientId}` | Client Service (8082) | Load client details |
| 2 | `GET` | `/api/proxy/account/api/accounts/client/{clientId}` | Account Service (8083) | Load existing accounts |
| 3 | `POST` | `/api/proxy/account/api/accounts` | Account Service (8083) | Create account |
| 3a | — | Account Service → `GET /api/clients/{clientId}` | Client Service (8082) | Cross-service ownership verification |

### Background Processing

| Trigger | Service | Action |
|---------|---------|--------|
| Account creation → SQS email queue | Lambda → SES | Sends "ACCOUNT_CREATED" email with account details table (ID, type, opening date, currency, balance, status) |
| Account creation → SQS log queue | Lambda → DynamoDB | Writes `ACCOUNT_CREATED` audit entry |
| Cache eviction | ElastiCache | `accounts-by-id` and `accounts-by-client` caches invalidated |

### AWS Services Involved

| Service | Role |
|---------|------|
| **ECS Fargate** | Runs Account Service and Client Service containers |
| **ALB** | Routes requests to appropriate service target groups |
| **RDS (account_transaction_db)** | Stores account record |
| **RDS (client_db)** | Validates client ownership (cross-service) |
| **SQS (email-queue)** | Buffers email notification |
| **SQS (log-queue)** | Buffers audit log |
| **Lambda (email sender)** → **SES** | Sends account confirmation email |
| **Lambda (log processor)** → **DynamoDB** | Stores audit trail |
| **ElastiCache** | Evicts and updates account caches |

### Postconditions

- Account record exists in `account_transaction_db.accounts` linked to the client and agent.
- Client receives an email with account details (account ID, type, opening date, currency, balance, status).
- `ACCOUNT_CREATED` audit log stored in DynamoDB.

---

## 4. Use Case 3 — Admin Removes an Agent with Client Reassignment

### Scenario

An agent resigns from the organization. An admin removes the agent from the system. The system automatically redistributes all of the departing agent's clients to the remaining agents using a load-balancing algorithm, removes the agent from Cognito, and soft-deletes the user record.

### Actors

- **Primary:** Admin
- **Secondary:** System (client reassignment, Cognito cleanup), remaining agents (receive reassigned clients)

### Preconditions

- Admin is authenticated with `admin` or `root_admin` role.
- Target agent exists and has not been soft-deleted.
- At least one other agent exists in the system (required for reassignment).

### User Flow

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Admin navigates to `/admin/agents` | Frontend fetches all users from User Service, filters to agents only. Paginated agent table displayed. |
| 2 | Admin clicks on the target agent's row | Agent detail drawer slides open showing the agent's profile and assigned client count. |
| 3 | Admin clicks "Delete" button | Delete confirmation modal appears with warning about client reassignment. |
| 4 | Admin confirms deletion | Frontend sends `DELETE /api/users/{agentId}` to User Service. |
| 5 | Admin sees the agent removed from the list | Agent list refreshes. The deleted agent no longer appears. |

### API Path Sequence

| Order | Method | Path | Target Service | Purpose |
|-------|--------|------|----------------|---------|
| 1 | `GET` | `/api/proxy/user/api/users` | User Service (8081) | List all users (filtered to agents) |
| 2 | `DELETE` | `/api/proxy/user/api/users/{agentId}` | User Service (8081) | Initiate agent deletion |

### Server-Side Orchestration (within `DELETE /api/users/{id}`)

| Step | Internal Call | Target | Purpose |
|------|---------------|--------|---------|
| 2a | `GET /api/clients/agent/{agentId}/ids` | Client Service (8082) | Fetch all active client IDs for departing agent |
| 2b | Load all other agents + their client counts | User DB (RDS) + Client Service | Build min-heap for load balancing |
| 2c | For each client: `PUT /api/clients/{clientId}` | Client Service (8082) | Reassign `assignedAgentId` to least-loaded agent |
| 2d | `AdminDeleteUser` | Cognito | Remove agent from identity provider |
| 2e | Set `deleted_at = NOW()` | User DB (RDS) | Soft-delete the user record |
| 2f | Publish `USER_DELETED` | SQS (log-queue) | Audit trail |

### Reassignment Algorithm

The system uses a **min-heap algorithm** to balance client distribution:

1. Query all non-deleted agents (excluding the departing agent).
2. For each remaining agent, count their current active clients.
3. Build a priority queue sorted by client count (ascending).
4. For each client being reassigned:
   - Pop the agent with the fewest clients.
   - Assign the client to that agent.
   - Increment that agent's count and push back into the heap.
5. If no other agents exist, the deletion is rejected with an error.

### AWS Services Involved

| Service | Role |
|---------|------|
| **Cognito** | Deletes user identity, removes from agent group |
| **ECS Fargate** | Runs User Service and Client Service containers |
| **RDS (user_db)** | Soft-deletes user record, queries remaining agents |
| **RDS (client_db)** | Updates `assigned_agent_id` on each reassigned client |
| **SQS (log-queue)** → **Lambda** → **DynamoDB** | Audit trail for `USER_DELETED` and multiple `CLIENT_UPDATED` events |
| **ElastiCache** | Evicts caches for all affected agents |

### Postconditions

- Agent's `deleted_at` field is set; record is retained for audit purposes.
- Agent is removed from Cognito and can no longer authenticate.
- All previously assigned clients now belong to other agents with balanced distribution.
- Audit log contains `USER_DELETED` entry plus `CLIENT_UPDATED` entries for each reassignment.

---

## 5. Use Case 4 — Automated Transaction Ingestion via SFTP

### Scenario

The core banking system exports a daily `transactions.csv` file to an external SFTP server. AccordCRM automatically pulls the file on a schedule, stages it in S3, parses and validates each row, and batch-inserts the transactions into the database. Agents can then see updated transaction history on their dashboards.

### Actors

- **Primary:** System (fully automated — no human interaction)
- **Secondary:** Agents (view ingested transactions after the fact)

### Preconditions

- AWS Transfer Family connector is configured with SFTP server credentials.
- EventBridge scheduler rule is active.
- S3 staging bucket exists with event notifications configured.
- RDS `account_transaction_db` is accessible from the Lambda's VPC.
- Accounts referenced by `account_id` in the CSV already exist in the database (FK constraint).

### Automated Flow

| Step | Trigger | Action | Service |
|------|---------|--------|---------|
| 1 | EventBridge scheduled cron fires | Invokes SFTP Initiator Lambda | EventBridge |
| 2 | Lambda executes | Calls `StartFileTransfer` on Transfer Family connector with remote path `/incoming/transactions.csv` and S3 destination | Lambda (sftp_initiator) → Transfer Family |
| 3 | Transfer Family pulls file from external SFTP | File downloaded and written to S3 staging bucket | Transfer Family → S3 |
| 4 | S3 `ObjectCreated` event fires | Invokes SFTP Processor Lambda with bucket/key metadata | S3 → Lambda (sftp_processor) |
| 5 | Lambda reads CSV from S3 | Downloads file, parses CSV headers and rows | Lambda → S3 |
| 6 | Lambda validates each row | Checks: required columns present, valid UUIDs, transaction_type ∈ {D, W}, status ∈ {Completed, Pending, Failed}, amount > 0, valid ISO 8601 timestamps | Lambda |
| 7 | Lambda batch-inserts into RDS | `INSERT INTO transactions (...) VALUES (...) ON CONFLICT (idempotency_key) DO NOTHING` via `psycopg2.extras.execute_batch()` with page_size 100 | Lambda → RDS |
| 8 | Lambda returns summary | Logs: rows parsed, rows inserted, rows skipped (duplicates/invalid) | Lambda → CloudWatch |

### CSV Format Expected

```csv
client_id,account_id,transaction_type,currency,amount,status,description,created_at
d0000000-...-001,e0000000-...-001,D,SGD,5000.00,Completed,Salary deposit,2026-04-01T09:00:00+08:00
d0000000-...-001,e0000000-...-001,W,SGD,200.00,Completed,ATM withdrawal,2026-04-01T14:30:00+08:00
```

### Idempotency

Each transaction row generates a unique `idempotency_key` (UUID). The `ON CONFLICT (idempotency_key) DO NOTHING` clause ensures that re-processing the same file does not create duplicate records.

### API Paths

No HTTP APIs are involved. This use case is entirely event-driven.

### AWS Services Involved

| Service | Role |
|---------|------|
| **EventBridge** | Scheduled cron trigger (e.g., daily at 02:00 SGT) |
| **Lambda (sftp_initiator)** | Calls Transfer Family to initiate file pull |
| **Transfer Family** | SFTP connector to external banking system |
| **S3 (staging bucket)** | Receives downloaded CSV files, fires event notification |
| **Lambda (sftp_processor)** | Parses CSV, validates rows, batch-inserts to RDS |
| **RDS (account_transaction_db)** | Stores transaction records with idempotency |
| **CloudWatch** | Lambda execution logs and metrics |
| **KMS** | Encrypts data at rest in S3 and RDS |

### Postconditions

- New transaction records exist in `account_transaction_db.transactions`.
- Duplicate rows are silently skipped (idempotent).
- Invalid rows are logged to CloudWatch but do not halt processing.
- Agents see updated transaction history when they next load their dashboards.

---

## 6. Use Case 5 — Agent Uses SmartCRM AI Chatbot for Client Analysis

### Scenario

An agent wants to understand a client's financial health and churn risk. Instead of manually querying multiple screens, the agent opens the SmartCRM chatbot and asks questions in natural language. The AI assistant uses tool calling to fetch real-time data, analyze patterns, and respond with actionable insights.

### Actors

- **Primary:** Agent
- **Secondary:** AI (Bedrock Claude), System (data retrieval, guardrails, audit)

### Preconditions

- Agent is authenticated with a valid session.
- SmartCRM chatbot feature flag is enabled (`/accord-crm/frontend/smartcrm-chatbot-enabled = "true"`).
- Bedrock model access is configured.
- Agent has at least one assigned client with account and transaction data.

### User Flow

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Agent clicks the SmartCRM floating action button (bottom-right) | Chat panel slides open. If a previous session exists in localStorage, it is loaded. |
| 2 | Agent types: "Show me Liam Tan's portfolio" | Message is displayed in the chat. Request sent to Account Service AI endpoint. |
| 3 | — | AI invokes `client_search` tool with query "Liam Tan". Client Service returns matching client record. AI then invokes `client_portfolio` tool with the client ID. Account Service returns all accounts with balances. |
| 4 | Agent sees structured portfolio response | AI responds with: client name, number of accounts, account types, balances, total portfolio value, and account statuses. |
| 5 | Agent types: "Is this client at risk of churning?" | Request sent with full conversation history (multi-turn). |
| 6 | — | AI invokes `churn_risk` tool. System analyzes: transaction frequency (30-day vs prior 30-day), deposit trends, failed transaction rates, large outward transfers (>$10,000), inactive accounts, days since last transaction. Bedrock generates risk assessment. Result cached in DynamoDB. |
| 7 | Agent sees churn analysis | AI responds with: risk score (0–100), risk level (Low/Medium/High/Critical), contributing factors, and recommended retention strategies. |
| 8 | Agent clicks chat history sidebar | `GET /api/ai/chat/sessions` returns list of past sessions with timestamps and message counts. |

### API Path Sequence

| Order | Method | Path | Target Service | Purpose |
|-------|--------|------|----------------|---------|
| 1 | `POST` | `/api/proxy/account/api/ai/chat` | Account Service (8083) | Send chat message |
| 1a | — | Account Service → `client_search` tool → Client Service | Client Service (8082) | Search for client by name |
| 1b | — | Account Service → `client_portfolio` tool → RDS query | Account Service (RDS) | Fetch accounts for client |
| 2 | `POST` | `/api/proxy/account/api/ai/chat` | Account Service (8083) | Follow-up message (multi-turn) |
| 2a | — | Account Service → `churn_risk` tool → RDS + Bedrock | Bedrock + RDS | Analyze churn risk |
| 3 | `GET` | `/api/proxy/account/api/ai/chat/sessions` | Account Service (8083) | List past chat sessions |
| 4 | `GET` | `/api/proxy/account/api/ai/chat/history/{sessionId}` | Account Service (8083) | Load full conversation |

### AI Tool Capabilities

| Tool Name | Description | Data Source |
|-----------|-------------|-------------|
| `my_clients` | Lists all clients assigned to the agent | Client Service |
| `client_search` | Searches clients by name | Client Service |
| `client_lookup` | Gets full client details by ID | Client Service |
| `client_portfolio` | Returns all accounts with balances | Account Service (RDS) |
| `churn_risk` | Computes churn risk score with factors | RDS + Bedrock analysis |
| `transaction_history` | Returns recent transactions for a client | Account Service (RDS) |
| `account_comparison` | Compares 30-day activity across accounts | Account Service (RDS) |
| `high_risk_clients` | Finds the agent's riskiest clients | RDS + Bedrock analysis |

### Security Guardrails

| Protection | Mechanism |
|------------|-----------|
| Rate limiting | Per-user request throttling |
| Prompt injection detection | Input validation before sending to Bedrock |
| Output sanitization | Prevents leaking system prompts, credentials, or internal architecture |
| Audit trail | Every prompt and response logged to DynamoDB |
| Role isolation | Agent can only query data for their own clients |

### AWS Services Involved

| Service | Role |
|---------|------|
| **Bedrock (Claude)** | Generates natural language responses, executes tool calls |
| **DynamoDB (ai-chatbot-audit)** | Stores every prompt/response pair for compliance audit |
| **DynamoDB (risk-score)** | Stores computed churn risk scores with factors and strategies |
| **RDS (account_transaction_db)** | Transaction and account queries for analysis |
| **RDS (client_db)** | Client lookups via cross-service calls |
| **ElastiCache** | Caches Bedrock responses (10 min TTL), risk scores (5 min TTL) |
| **ECS Fargate** | Runs Account Service with AI controller |

### Postconditions

- Agent has actionable insights without manual data lookup.
- Chat session persisted in DynamoDB for future reference.
- Risk score cached for 5 minutes to avoid redundant Bedrock calls.
- Full audit trail of all AI interactions stored for compliance review.

---

## 7. Use Case 6 — Root Admin Onboards a New Admin

### Scenario

The CTO needs to add a new team lead as an administrator. Only root admins have permission to create admin users. The root admin creates the account, which provisions the user in both the database and Cognito with appropriate group membership.

### Actors

- **Primary:** Root Admin
- **Secondary:** New Admin (receives credentials), System (Cognito provisioning)

### Preconditions

- Root admin is authenticated with `root_admin` group membership in Cognito.
- The email address for the new admin is not already in use.

### User Flow

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Root admin logs in at `/login/admin` | Cognito validates credentials. JWT contains `root_admin` group. Session created. Redirected to `/admin/root/dashboard`. |
| 2 | Root admin views dashboard | System fetches all users (agents + admins), client count. Dashboard shows: Total Admins, Total Agents, Total Clients, Recent Admins, Recent Agents. |
| 3 | Root admin navigates to `/admin/root/admins/new` | Form loads with fields: First Name, Last Name, Email. |
| 4 | Root admin fills in details and submits | Frontend sends `POST /api/users` with `isAdmin: true`. |
| 5 | — | User Service creates DB record, then calls Cognito to provision the user with initial password `Accord@{first-8-chars-of-UUID}`, adds to `admin` Cognito group, and stores the Cognito `sub` in the DB. |
| 6 | Root admin sees the new admin in the admin list | Dashboard refreshes showing the new admin. |

### API Path Sequence

| Order | Method | Path | Target Service | Purpose |
|-------|--------|------|----------------|---------|
| 1 | `POST` | `/api/auth/login` | Next.js → Cognito → User Service | Authenticate root admin |
| 2 | `GET` | `/api/proxy/user/api/users` | User Service (8081) | Load all users for dashboard |
| 3 | `GET` | `/api/proxy/client/api/clients/count` | Client Service (8082) | Client count for dashboard |
| 4 | `POST` | `/api/proxy/user/api/users` | User Service (8081) | Create admin user |

### Server-Side Processing (within `POST /api/users`)

| Step | Internal Action | Service |
|------|-----------------|---------|
| 4a | Validate: caller is root admin (only root admin can set `isAdmin: true`) | User Service |
| 4b | Check email uniqueness against existing users | RDS (user_db) |
| 4c | Create user record with `is_admin=true`, `is_root_admin=false` | RDS (user_db) |
| 4d | `AdminCreateUser` with email, given_name, family_name, custom:role="admin" | Cognito |
| 4e | `AdminSetUserPassword` with initial password (permanent) | Cognito |
| 4f | `AdminAddUserToGroup` → "admin" group | Cognito |
| 4g | Store Cognito `sub` in user record | RDS (user_db) |
| 4h | Publish `USER_CREATED` audit log | SQS → Lambda → DynamoDB |

### Authorization Enforcement

| Caller Role | Can Create Agent? | Can Create Admin? |
|-------------|-------------------|-------------------|
| Agent | No (403) | No (403) |
| Admin | Yes | No (403) |
| Root Admin | Yes | Yes |

### AWS Services Involved

| Service | Role |
|---------|------|
| **Cognito** | Creates user identity, sets password, assigns to admin group |
| **RDS (user_db)** | Stores user record with `is_admin=true` |
| **SQS (log-queue)** → **Lambda** → **DynamoDB** | Audit trail for `USER_CREATED` |
| **ECS Fargate** | Runs User Service |

### Postconditions

- New admin user exists in both RDS and Cognito.
- Admin can log in with initial password `Accord@{first-8-chars-of-UUID}`.
- Admin has `admin` group membership in Cognito.
- `USER_CREATED` audit log stored in DynamoDB.
- Admin can manage agents but cannot create other admins or access root admin features.

---

## 8. Use Case 7 — Agent Verifies a Client's Identity

### Scenario

A client visits the branch with identity documents (passport, national ID, or biometric scan). The assigned agent verifies the client's identity in AccordCRM, which records the verification method and timestamp, sends a confirmation email to the client, and creates an audit trail.

### Actors

- **Primary:** Agent
- **Secondary:** Client (receives confirmation email), System (audit logging)

### Preconditions

- Agent is authenticated and assigned to the client.
- Client exists and has not been soft-deleted.
- Client has not already been verified (`verified_at` is NULL).

### User Flow

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Agent navigates to `/agent/clients/{clientId}` | Client profile loads. Verification status shows a red "Unverified" badge. |
| 2 | Agent clicks "Verify" button | Verification dialog opens with method selection (e.g., DOCUMENT, BIOMETRIC). |
| 3 | Agent selects "DOCUMENT" and confirms | Frontend sends `PUT /api/clients/{clientId}/verify` with body `{ "verificationMethod": "DOCUMENT" }`. |
| 4 | Agent sees updated status | Badge changes to green "Verified" with timestamp. |

### API Path Sequence

| Order | Method | Path | Target Service | Purpose |
|-------|--------|------|----------------|---------|
| 1 | `GET` | `/api/proxy/client/api/clients/{clientId}` | Client Service (8082) | Load client details |
| 2 | `PUT` | `/api/proxy/client/api/clients/{clientId}/verify` | Client Service (8082) | Mark client as verified |

### Server-Side Processing

| Step | Action | Detail |
|------|--------|--------|
| 2a | Check if already verified | If `verified_at != NULL`, return 400 error |
| 2b | Validate verification method provided | Must not be blank |
| 2c | Set `verified_at = Instant.now()` | Timestamp recorded |
| 2d | Set `verification_method = "DOCUMENT"` | Method recorded |
| 2e | Publish "VERIFICATION" email | SQS email queue |
| 2f | Publish `CLIENT_VERIFICATION_PASSED` log | SQS log queue |
| 2g | Update client cache | ElastiCache |

### AWS Services Involved

| Service | Role |
|---------|------|
| **RDS (client_db)** | Updates `verified_at` and `verification_method` fields |
| **SQS (email-queue)** → **Lambda** → **SES** | Sends verification confirmation email to client |
| **SQS (log-queue)** → **Lambda** → **DynamoDB** | Stores `CLIENT_VERIFICATION_PASSED` audit entry |
| **ElastiCache** | Updates cached client record |

### Postconditions

- Client's `verified_at` is set to the current timestamp.
- Client's `verification_method` is set to "DOCUMENT" (or "BIOMETRIC").
- Client receives a branded confirmation email.
- Audit log records the verification event with agent ID and timestamp.
- Subsequent verification attempts are rejected (client can only be verified once).

---

## 9. Use Case 8 — Admin Reviews Transactions and Audit Logs for Compliance

### Scenario

A compliance officer (admin) conducts a periodic review of all transaction activity and agent actions across the system. The admin examines transactions for suspicious patterns, reviews audit logs to ensure agents are following proper procedures, and verifies account statuses.

### Actors

- **Primary:** Admin (compliance officer)
- **Secondary:** System (data aggregation across services)

### Preconditions

- Admin is authenticated with `admin` or `root_admin` role.
- Transaction data exists in the system (from agent-created accounts or SFTP ingestion).
- Audit logs exist in DynamoDB from prior operations.

### User Flow

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Admin navigates to `/admin/transactions` | Frontend fetches all transactions (paginated), all clients (for name mapping), and all accounts (for type mapping) in parallel. Transaction table rendered with columns: Type, Amount, Status, Date, Time, Client. |
| 2 | Admin pages through transactions, reviewing amounts and statuses | Pagination requests fetch next page. Each page shows 10 transactions sorted by date descending. |
| 3 | Admin clicks on a suspicious transaction row | Transaction detail drawer slides open showing: transaction ID, account ID, account type, client name, correlation ID, amount, currency, status, failure reason (if failed), and timestamps. |
| 4 | Admin navigates to `/admin/activities` | Frontend fetches audit logs from User Service (which queries DynamoDB). Logs are grouped and displayed with: action, entity name, timestamp, status. |
| 5 | Admin clicks on an activity entry | Activity detail drawer opens showing: before/after values for updates, actor ID, source service, and reason. |
| 6 | Admin navigates to `/admin/accounts` | Frontend fetches all accounts and clients. Table shows: Client, Account ID, Type, Status, Balance, Currency, Opening Date. Admin can search and filter. |
| 7 | Admin identifies an inactive account with high prior balance | Admin notes the finding for follow-up with the assigned agent. |

### API Path Sequence

| Order | Method | Path | Target Service | Purpose |
|-------|--------|------|----------------|---------|
| 1a | `GET` | `/api/proxy/account/api/transactions?page=0&size=10` | Account Service (8083) | Fetch transactions (paginated) |
| 1b | `GET` | `/api/proxy/client/api/clients?page=0&size=100` | Client Service (8082) | Client names for mapping |
| 1c | `GET` | `/api/proxy/account/api/accounts` | Account Service (8083) | Account types for mapping |
| 2 | `GET` | `/api/proxy/account/api/transactions?page=N&size=10` | Account Service (8083) | Next page of transactions |
| 3 | `GET` | `/api/proxy/account/api/transactions/{transactionId}` | Account Service (8083) | Full transaction detail |
| 4 | `GET` | `/api/proxy/user/api/users/logs` | User Service (8081) → DynamoDB | Fetch audit logs |
| 5 | — | (data already in response from step 4) | — | Detail view from cached data |
| 6 | `GET` | `/api/proxy/account/api/accounts/AllAccounts` | Account Service (8083) | All accounts system-wide |

### Audit Log Visibility Rules

| Caller Role | Visible Logs |
|-------------|-------------|
| Agent | Own actions only |
| Admin | All agent actions + own actions |
| Root Admin | All actions system-wide (agents + admins + root admins) |

### Data Displayed in Transaction Table

| Column | Source | Format |
|--------|--------|--------|
| Type | `transaction_type` | Icon: D = arrow-down (green), W = arrow-up (red) |
| Amount | `amount` + `currency` | e.g., "SGD 5,000.00" |
| Status | `status` | Badge: Completed (green), Pending (amber), Failed (red) |
| Date | `created_at` | e.g., "4 Apr 2026" |
| Time | `created_at` | e.g., "2:30 PM" |
| Client | `client_id` → client name lookup | e.g., "Liam Tan" |

### AWS Services Involved

| Service | Role |
|---------|------|
| **RDS (account_transaction_db)** | Transaction and account queries |
| **RDS (client_db)** | Client name lookups for display mapping |
| **DynamoDB (accord-crm-log)** | Audit log storage and retrieval (before/after values, actor, action) |
| **ElastiCache** | Cached query results for accounts and clients |
| **ECS Fargate** | Runs all three backend services |
| **ALB** | Routes requests to correct service target groups |

### Postconditions

- Admin has reviewed transaction history across all agents and clients.
- Admin has audited agent actions via the activity log.
- No data is modified — this is a read-only compliance review.
- Any suspicious findings are noted for follow-up (outside the system scope).

---

## 10. AWS Service Dependency Matrix

The following matrix maps each use case to the AWS services it depends on.

| AWS Service | UC1: Client Onboard | UC2: Account Creation | UC3: Agent Deletion | UC4: SFTP Ingestion | UC5: AI Chatbot | UC6: Admin Creation | UC7: Client Verification | UC8: Compliance Review |
|-------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Cognito** | x | | | | | x | | |
| **ECS Fargate** | x | x | x | | x | x | x | x |
| **ALB** | x | x | x | | x | x | x | x |
| **RDS (user_db)** | | | x | | | x | | |
| **RDS (client_db)** | x | x | x | | x | | x | x |
| **RDS (account_transaction_db)** | | x | | x | x | | | x |
| **SQS (log-queue)** | x | x | x | | | x | x | |
| **SQS (email-queue)** | x | x | | | | | x | |
| **Lambda (log processor)** | x | x | x | | | x | x | |
| **Lambda (email sender)** | x | x | | | | | x | |
| **Lambda (sftp_initiator)** | | | | x | | | | |
| **Lambda (sftp_processor)** | | | | x | | | | |
| **DynamoDB (log)** | x | x | x | | | x | x | x |
| **DynamoDB (risk-score)** | | | | | x | | | |
| **DynamoDB (ai-chatbot-audit)** | | | | | x | | | |
| **Bedrock (Claude)** | | | | | x | | | |
| **SES** | x | x | | | | | x | |
| **ElastiCache (Redis)** | x | x | x | | x | | x | x |
| **S3 (staging)** | | | | x | | | | |
| **Transfer Family** | | | | x | | | | |
| **EventBridge** | | | | x | | | | |
| **KMS** | x | x | x | x | x | x | x | x |
| **CloudWatch** | x | x | x | x | x | x | x | x |
| **WAF** | x | x | x | | x | x | x | x |
| **Route 53** | x | x | x | | x | x | x | x |
| **ACM** | x | x | x | | x | x | x | x |

---

*End of report.*
