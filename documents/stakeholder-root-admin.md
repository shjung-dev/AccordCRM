# Stakeholder: Root Administrator

## Root Administrator

The Root Administrator is the highest-privilege user in AccordCRM. This role has full visibility across the entire system and serves as the ultimate authority for user management, activity auditing, and organisational oversight. Root Administrators are the only users who can create and delete other administrators, making them the gatekeepers of the system's administrative hierarchy. A Root Administrator cannot be deleted by anyone, including other Root Administrators, ensuring a permanent top-level authority exists in the system at all times. The initial Root Administrator is created during the system's first deployment and serves as the foundation from which all other users are provisioned.

Their responsibilities and permissions are as follows:

### Authentication and Access
Authenticates via the admin login page using their email and password. Upon successful login, the system identifies the user as a Root Administrator based on their identity group membership and redirects them to the Root Administrator dashboard — an exclusive landing page that is not accessible to regular administrators or agents. Sessions are maintained automatically and refreshed periodically without requiring re-authentication.

### Dashboard and System Overview
The Root Administrator dashboard provides a comprehensive, system-wide operational summary. It displays the total number of administrators, agents, and clients across the entire organisation. The dashboard also shows paginated lists of recently created administrators and recently created agents, providing immediate visibility into recent user provisioning activity. All data is fetched in real time from the relevant services and presented in a unified view.

### User Management — Administrator Creation
The Root Administrator is the only role permitted to create other administrators. Through a dedicated form, they can provision a new administrator by providing the individual's first name, last name, and email address. The system creates the user record in the database and provisions a corresponding identity in the authentication provider with an initial password and appropriate administrative group membership. The new administrator can then log in and begin managing agents. A full audit trail is recorded for every administrator created.

### User Management — Agent Creation
Root Administrators can also create agents using the same provisioning flow. They submit the agent's details, and the system creates the user record with agent-level permissions and provisions the authentication identity with agent group membership. This capability is shared with regular administrators.

### User Management — User Deletion
Root Administrators can delete any user in the system except other Root Administrators:
- **Deleting an agent**: When an agent is removed, the system automatically redistributes all of the departing agent's clients to the remaining agents. The redistribution uses a load-balancing algorithm that assigns each client to the agent with the fewest current clients, ensuring an even workload distribution. The agent is removed from the authentication system and their record is marked as deleted in the database. Audit logs are created for the deletion and each client reassignment.
- **Deleting an administrator**: The same soft-deletion and authentication removal process applies, but without client reassignment since administrators do not own clients. Only Root Administrators can delete administrators — regular administrators cannot delete each other.
- **Cannot delete Root Administrators**: The system explicitly prevents the deletion of any Root Administrator, regardless of who initiates the request. This ensures the system always maintains at least one top-level authority.

### Client Information — Read-Only Access
Root Administrators have full read-only visibility across all client records in the system. They can view paginated lists of all clients and inspect individual client profiles, including personal details, contact information, identification, address, verification status, assigned agent, and creation date. However, Root Administrators cannot create, edit, verify, or delete clients — these operations are exclusively reserved for agents.

### Client Reassignment
Root Administrators can reassign clients from one agent to another. When updating a client record, they are permitted to change only the assigned agent — all other client fields are protected from administrative modification. This capability is used for workload rebalancing, team restructuring, or manual corrections. Client reassignment also occurs automatically during agent deletion.

### Account and Transaction Information — Read-Only Access
Root Administrators have full read-only visibility across all accounts and transactions in the system. They can view all bank accounts with their type, status, balance, currency, and opening date. They can view all transactions with their type (deposit or withdrawal), amount, status, date, and associated client. They can inspect individual transaction details including correlation identifiers and failure reasons. However, Root Administrators cannot create accounts, delete accounts, or initiate transactions.

### Activity Logs — Full System Visibility
Root Administrators have unrestricted access to all audit logs across the entire system. They can view every action performed by every user — agents, regular administrators, and other Root Administrators. This includes user creation and deletion events, client management actions, account operations, and verification events. Each log entry captures the actor, the action performed, the affected entity, a timestamp, and optionally the before and after values for update operations. Activity logs are immutable and cannot be edited or deleted by anyone.

### System Settings
Root Administrators have exclusive access to the system settings page, which is not available to regular administrators or agents.

### Undeletable Status
The Root Administrator's elevated status cannot be modified through the application. Any attempt to change the Root Administrator flag or delete a Root Administrator is rejected by the system. This design ensures that the organisation always retains at least one user with full administrative authority, preventing lockout scenarios.

### What the Root Administrator Does NOT Do
- Does not create, edit, verify, or delete clients directly — this is exclusively the agent's responsibility.
- Does not create or delete bank accounts or transactions.
- Does not use the SmartCRM AI chatbot — this is an agent-only feature.
- Does not manage infrastructure, deployment pipelines, or cloud services — this is the DevOps Engineer's responsibility.

### Summary
The Root Administrator is the system's ultimate authority, responsible for managing the administrative hierarchy, maintaining full audit visibility, and overseeing all operational data. They are the only role that can create and delete administrators, and they are the only role that cannot be removed from the system. Their access is comprehensive but read-only for client, account, and transaction data — they observe and govern, while agents execute.
