# RBAC Policy (Updated)

## RBAC Matrix (Concise)

```
Permission / Role                           Root Admin       Admin (Non-root)     Agent
------------------------------------------------------------------------------------------
Create Admins (non-root)                       Yes                No               No
Create Agents                                  Yes                Yes              No
Delete Admins (non-root)                       Yes                No               No
Delete Agents                                  Yes                Yes              No
Delete Root Admin                              No (by anyone)     No               No
Deletable by                                   Nobody             Root Admin       Admin / Root Admin
Reassign Clients (agent → agent)               Yes                Yes              No
View Activity Logs (all admins + agents)       Yes                No               No
View Activity Logs (all agents + own)          Yes                Yes              No
View Activity Logs (own only)                  Yes                Yes              Yes
View Client Information (read-only)            Yes                Yes              No
View Client Information (read + write)         No                 No               Yes (own clients)
Create Clients                                 No                 No               Yes
Delete Clients                                 No                 No               Yes (own only)
Create Accounts (for clients)                  No                 No               Yes (own clients)
Delete Accounts (for clients)                  No                 No               Yes (own clients)
Direct Access to Clients                       No                 No               Yes
------------------------------------------------------------------------------------------
Client Ownership                               None               None             Own only
```

## Access-Control Policy

**Global Deletion Rule**
All "delete" actions are **soft deletions** (records remain but are marked inactive/archived).

---

### Root Administrator

- **User Management:** Root admins can create (non-root) admins and agents. Root admins can delete (non-root) admins and agents.
- **Undeletable:** Root admins **cannot be deleted by anyone** (including other root admins).
- **Activity Logs:** Root admins have a full birds-eye view of **all** activity logs — both non-root admin logs and agent logs.
- **Client Reassignment:** Root admins can reassign/redistribute clients from one agent to another agent.
- **Client Information:** Root admins can view client information, but have **read-only access**. They do not have write access, as agents are the ones who manage clients. Root admins cannot access clients directly.

---

### Admin (Non-root)

- **User Management:** Non-root admins **cannot** create other admins. They can only create agents. Non-root admins can delete agents, but **cannot** delete other admins.
- **Deletable by:** Non-root admins can only be deleted by **root admins**.
- **Activity Logs:** Non-root admins have a birds-eye view of **all agent activity logs**, but can only see **their own** admin activity logs. They **cannot** see other admins' activity logs.
- **Client Reassignment:** Non-root admins can reassign/redistribute clients from one agent to another agent.
- **Client Information:** Non-root admins can view client information, but have **read-only access**. They do not have write access, as agents are the ones who manage clients. Non-root admins cannot access clients directly.

---

### Agent

- **User Management:** Agents **cannot** create other agents. Agents can only create clients.
- **Client Ownership:** An agent can have **multiple clients**, but a client can only belong to **one agent** at a time (a client cannot be under two agents simultaneously).
- **Client Management:** Agents can delete clients, but **only clients they created**. Agents **cannot** delete other agents' clients.
- **Account Management:** Agents can create **multiple accounts** for their clients and delete accounts for their clients. Agents **cannot** delete other agents' clients' accounts.
- **Activity Logs:** Agents can only see **their own** activity log. They **cannot** see other agents' activity logs.
- **Client Information:** Agents have **read and write access** to client information, as agents are the ones who manage clients. Agents have **direct access** to their clients — admins and root admins cannot access clients directly.
