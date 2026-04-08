# Stakeholder: Non-Root Administrator

## Non-Root Administrator

The Non-Root Administrator is a mid-level supervisory role in AccordCRM responsible for managing agents and overseeing agent activity. They serve as the operational managers of the CRM, handling agent onboarding and offboarding, monitoring agent performance through activity logs, and managing client reassignment when agents leave or workloads need rebalancing. Non-Root Administrators can manage agents but cannot manage other administrators — that authority is reserved exclusively for Root Administrators. They have broad read-only visibility across all client, account, and transaction data, but they cannot directly create, edit, or delete client records.

Their responsibilities and permissions are as follows:

### Authentication and Access
Authenticates via the admin login page using their email and password. Upon successful login, the system identifies the user as a Non-Root Administrator based on their identity group membership and redirects them to the administrator dashboard — a different landing page from the Root Administrator's exclusive dashboard. Non-Root Administrators cannot access Root Administrator pages such as the root dashboard, admin creation form, or system settings. Attempting to navigate to these pages results in a redirect back to the standard administrator dashboard.

### Dashboard and Operational Overview
The Non-Root Administrator dashboard provides an operational summary focused on agents and clients. It displays the total number of agents and the total number of clients across the system, along with a paginated list of recently created agents. Unlike the Root Administrator dashboard, it does not display administrator counts or administrator lists — that visibility is exclusive to Root Administrators.

### User Management — Agent Creation
Non-Root Administrators can create new agent users through a dedicated form by providing the agent's first name, last name, and email address. The system creates the user record with agent-level permissions and provisions the authentication identity with agent group membership and an initial password. A full audit trail is recorded for every agent created.

### User Management — Agent Deletion
Non-Root Administrators can delete agents, which triggers automatic client reassignment. When an agent is removed, the system fetches all of the departing agent's active clients and redistributes them across the remaining agents using a load-balancing algorithm that assigns each client to the agent with the fewest current clients. The agent is removed from the authentication system and their database record is marked as deleted. If the agent being deleted is the last remaining agent in the system, the deletion is rejected — at least one agent must exist for client reassignment to succeed. Audit logs are recorded for the deletion and each client reassignment.

### User Management — Cannot Manage Administrators
Non-Root Administrators cannot create, edit, or delete other administrators, whether root or non-root. When viewing the user list, Non-Root Administrators only see agents — other administrators are not visible to them. Attempting to create an administrator or delete another administrator is rejected by the system. This boundary ensures that administrative hierarchy management remains the exclusive domain of Root Administrators.

### User Management — Agent Profile Updates
Non-Root Administrators can update agent profile information including first name, last name, email address, and phone number. They cannot modify an agent's role or administrative status. They cannot update other administrators' profiles.

### Client Information — Read-Only Access
Non-Root Administrators have full read-only visibility across all client records in the system. They can view paginated lists of all clients and inspect individual client profiles with all personal details, contact information, verification status, and assigned agent. However, they cannot create, edit, verify, or delete clients — these operations are exclusively reserved for agents.

### Client Reassignment
Non-Root Administrators can reassign clients between agents by changing the assigned agent on a client record. When performing this update, they are only permitted to change the agent assignment — all other client fields are protected from administrative modification. This capability is used for workload rebalancing, team restructuring, or manual reassignment when the automated redistribution during agent deletion is insufficient.

### Account and Transaction Information — Read-Only Access
Non-Root Administrators have full read-only visibility across all accounts and transactions. They can view all bank accounts with their type, status, balance, and currency. They can view all transactions with their type, amount, status, date, and associated client. They can inspect individual transaction details in full. However, they cannot create accounts, delete accounts, or initiate transactions.

### Activity Logs — Agent-Scoped Visibility
Non-Root Administrators can view all activity logs generated by agents and their own logs, but they cannot view logs generated by other administrators or Root Administrators. This means they have full visibility into agent operations — every client created, account opened, verification performed, and deletion executed by any agent is visible in their activity log view. Their own management actions (agent creation, agent deletion) are also visible. However, actions performed by other administrators remain hidden from their view. Activity logs are immutable and cannot be edited or deleted.

### Deletable Status
Non-Root Administrators can be deleted only by Root Administrators. Regular administrators cannot delete each other. Upon deletion, the administrator is removed from the authentication system and their database record is marked as deleted. No client reassignment occurs because administrators do not own clients.

### What the Non-Root Administrator Does NOT Do
- Does not create, edit, verify, or delete clients — this is the agent's responsibility.
- Does not create or delete bank accounts or transactions.
- Does not create or delete other administrators — this is the Root Administrator's exclusive authority.
- Does not access the Root Administrator dashboard, admin creation page, or system settings.
- Does not use the SmartCRM AI chatbot — this is an agent-only feature.
- Does not view other administrators' activity logs.
- Does not manage infrastructure, deployment pipelines, or cloud services.

### Summary
The Non-Root Administrator is the operational manager of the CRM, focused on agent lifecycle management and operational oversight. They can onboard and offboard agents, monitor agent activity, reassign clients, and review all client, account, and transaction data — but they cannot modify client data directly, manage other administrators, or access Root Administrator features. They serve as the supervisory layer between the Root Administrator's governance role and the agents' day-to-day execution.
