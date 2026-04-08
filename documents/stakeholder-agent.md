# Stakeholder: Agent

## Agent

The Agent is the primary operational user of AccordCRM and the only role with direct client management capabilities. Agents are relationship managers who handle the full lifecycle of client relationships — from onboarding new customers to verifying their identity, opening and closing bank accounts, and monitoring day-to-day transactions. Each agent exclusively owns their assigned clients under a strict ownership model: a client belongs to exactly one agent, and agents cannot access, view, or modify other agents' clients. Agents are also the sole users of the SmartCRM AI chatbot, which provides AI-powered client analysis, churn risk assessment, and natural language querying of client data.

Their responsibilities and permissions are as follows:

### Authentication and Access
Authenticates via the agent login page using their email and password. Upon successful login, the system identifies the user as an agent based on their identity group membership and redirects them to the agent dashboard — a personalised landing page showing only their own data. If this is the agent's first login and the system requires a password change, the agent is prompted to set a new password before proceeding. Sessions are maintained automatically and refreshed periodically without requiring re-authentication.

### Dashboard and Personal Overview
The agent dashboard provides a personalised operational summary scoped exclusively to the agent's own clients. It displays the total number of clients assigned to the agent, the number of accounts opened (active and pending) across those clients, and the number of transactions recorded for today. A recent activity timeline shows the latest transaction activity for the agent's client portfolio. A prominent "Create Client" button provides quick access to the client onboarding form.

### Client Management — Full Lifecycle on Own Clients
The agent is the only role that can create, read, update, and delete client records:

**Client Creation:**
The agent onboards new clients by filling in a comprehensive registration form with all required personal details: first name, last name, date of birth, gender, email address, phone number, identification number (passport or national ID), and full address (street, city, state, country, postal code). The system validates all inputs — including age requirements (must be between 18 and 100 years old), email format, phone number format, and field length constraints. Upon submission, the client record is created and automatically assigned to the creating agent. The system sends a branded welcome email to the client inviting them to visit their branch for identity verification. A full audit trail is recorded for the creation event.

**Client Viewing:**
Agents can view a paginated list of their own clients, showing name, email, phone number, number of accounts, verification status, and creation date. Clicking a client opens a detail panel or page displaying the full client profile, associated accounts, and activity history. Agents can only see clients assigned to them — attempting to access a client belonging to another agent is blocked by the system.

**Client Editing:**
Agents can update their clients' personal information through an edit form pre-populated with the current data. Only the fields provided in the update are changed (partial update). The system re-validates all modified data, ensures email uniqueness across active clients, and sends a profile update notification email to the client. Agents cannot reassign their clients to other agents — only administrators can perform reassignment.

**Client Deletion:**
Agents can soft-delete a client by providing an optional reason for the deletion. The client record is marked as deleted but retained in the database for audit purposes. All associated bank accounts are automatically deactivated. The client receives a profile closure notification email. Deleted clients are excluded from all active lists and queries.

### Client Identity Verification
The agent is the only role that can verify a client's identity. When a client visits the branch with identity documents, the agent selects the appropriate verification method — such as document verification (passport, national ID) or biometric verification (fingerprint, facial recognition) — and confirms the verification. The system records the verification timestamp and method, updates the client's status from "Unverified" to "Verified", and sends a verification confirmation email to the client. A client can only be verified once — subsequent verification attempts are rejected.

### Account Management — Create and Delete for Own Clients
Agents manage bank accounts for their assigned clients:

**Account Creation:**
From the client detail page, the agent creates a new bank account by specifying the account type (Savings, Checking, or Business), account status (Active, Inactive, or Pending), currency (e.g., SGD, USD), and opening balance. The system verifies that the agent is assigned to the client before creating the account. Upon creation, the client receives a detailed email notification with the account information including account ID, type, opening date, currency, balance, and status. An audit trail is recorded.

**Account Deletion:**
The agent can close an account by deactivating it. The system verifies agent ownership, sets the account status to "Inactive", sends an account closure email to the client, and records the event in the audit log. Accounts are not physically removed — they are soft-deleted by status change.

### Transaction Viewing — Own Clients Only
Agents can view transactions for their own clients through a dedicated transaction page with pagination. Each transaction shows the type (deposit or withdrawal), amount, currency, status (completed, pending, or failed), date, and associated client. Agents can view individual transaction details in an expanded view showing the full metadata including correlation identifiers and failure reasons. Agents cannot create transactions directly — transactions are ingested into the system automatically from the core banking system through a scheduled file transfer pipeline. Agents cannot view transactions belonging to other agents' clients.

### SmartCRM AI Chatbot
The agent is the sole user of the AI-powered chatbot, accessible via a floating action button on any agent page:

**Conversational Interface:**
Agents can ask natural language questions about their client portfolio. The AI assistant can search for clients by name, retrieve full client profiles, display account portfolios with balances, analyse transaction history, and compare activity across accounts.

**Churn Risk Analysis:**
Agents can request churn risk assessments for individual clients. The AI analyses transaction patterns — including frequency trends, deposit amounts, failed transaction rates, large outward transfers, and days since last activity — and produces a risk score (0–100), risk level (Low, Medium, High, or Critical), contributing factors, and recommended retention strategies.

**Multi-Turn Conversations:**
The chatbot maintains conversation context across multiple messages within a session, allowing agents to ask follow-up questions naturally. Past conversations are accessible through a chat history sidebar and can be resumed at any time.

**Security and Compliance:**
Every prompt and response is recorded for compliance auditing. The chatbot includes guardrails against prompt injection attempts, enforces rate limiting, and ensures agents can only query data about their own clients.

**Feature Flag:**
The chatbot can be enabled or disabled system-wide through a configuration flag without requiring code changes or redeployment.

### Activity Logs — Own Logs Only
Agents can view their own activity history through a dedicated activity page. The system strictly filters logs so that agents can only see actions they themselves have performed — they cannot view other agents' logs, administrators' logs, or root administrators' logs. Log entries show the action performed, the entity affected, the timestamp, and the status.

### Self-Service Profile Management
Agents can update their own profile information including first name, last name, email address, and phone number. They cannot modify their own role or administrative status. They cannot view or modify other users' profiles.

### Deletable Status
Agents can be deleted by any administrator (Root or Non-Root). Upon deletion, the agent is removed from the authentication system and their database record is marked as deleted. All of the agent's clients are automatically redistributed to the remaining agents using a load-balancing algorithm that assigns each client to the agent with the fewest current clients. The agent can no longer log in after deletion.

### What the Agent Does NOT Do
- Does not create, edit, or delete any users (agents, administrators, or root administrators).
- Does not view other agents' clients, accounts, or transactions.
- Does not reassign clients to other agents — only administrators can do this.
- Does not access any administrator dashboard or settings page.
- Does not view other users' activity logs.
- Does not create transactions — these are ingested from the core banking system automatically.
- Does not manage infrastructure, deployment pipelines, or cloud services.

### Summary
The Agent is the operational backbone of AccordCRM, executing all direct client-facing activities. They are the only role that can create, modify, verify, and delete clients; the only role that can open and close bank accounts; and the only role with access to the AI-powered SmartCRM chatbot. Their access is strictly scoped to their own assigned clients — they operate in an isolated ownership domain, unable to see or affect any other agent's data. They are managed by administrators and governed by Root Administrators, but within their client portfolio, they have full operational authority.
