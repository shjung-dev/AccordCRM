# Stakeholder: Client (External)

## Client (External Stakeholder)

The Client is the external stakeholder of AccordCRM. Clients are the end-users of the financial services managed through the CRM — they are the customers whose profiles, accounts, and transactions are tracked and managed by agents. Clients do not have any access to the AccordCRM system: they cannot log in, view any dashboards, perform any actions, or access any data within the application. Their only interaction with the system is through automated email notifications triggered by actions taken on their behalf by their assigned agent. The client's entire lifecycle within AccordCRM is managed by their assigned agent.

Their relationship with the system is as follows:

### No System Access
Clients have no login credentials and no application access. There is no client login page, client dashboard, or client-facing portal in AccordCRM. Clients exist only as data records managed by agents. All data about a client — their profile, accounts, transactions, and verification status — is created, viewed, and maintained exclusively by their assigned agent through the agent's authenticated session. Clients cannot view their own records, request changes, or initiate any actions within the system.

### Client Lifecycle
The client's entire lifecycle is managed by their assigned agent, with automated email notifications keeping the client informed at each stage:

**1. Client Onboarding (Welcome Email)**
The assigned agent creates the client profile by entering personal details including name, date of birth, gender, email, phone number, identification number, and full address. Upon successful creation, the client receives a branded welcome email inviting them to visit their branch to complete identity verification. The client is created in an unverified state and assigned to the creating agent.

**2. Identity Verification (Verification Confirmation Email)**
The assigned agent verifies the client's identity, typically during an in-person branch visit, by confirming the verification method used (such as document or biometric verification). The client receives a branded confirmation email notifying them that their identity has been successfully verified. The verification timestamp and method are recorded in the system.

**3. Account Opening (Account Creation Email)**
The assigned agent creates one or more bank accounts (Savings, Checking, or Business) for the client. For each account created, the client receives a branded email containing the account details: account ID, account type, opening date, currency, initial balance, and account status.

**4. Account Closure (Account Deletion Email)**
If an account needs to be closed, the assigned agent deactivates it through the system. The client receives a branded notification that their account has been closed. The account is not physically removed — it is marked as inactive.

**5. Profile Updates (Profile Update Email)**
When the assigned agent updates any of the client's profile information (name, email, phone, address, etc.), the client receives a branded notification that their profile has been updated.

**6. Client Deletion (Profile Closure Email)**
If the client relationship is terminated, the assigned agent soft-deletes the client record with an optional deletion reason. The client receives a branded notification that their profile has been closed. All associated bank accounts are automatically deactivated. The client record is retained in the database for audit purposes but excluded from all active queries and lists.

**7. Agent Reassignment**
If the client's assigned agent is deleted from the system or if an administrator manually reassigns the client, the client is transferred to a different agent. The client's personal data, accounts, and transaction history remain unchanged — only the managing agent changes. When an agent is deleted, the system automatically redistributes their clients to the remaining agents using a load-balancing algorithm.

### Email Communication
All client-facing communication is automated and delivered via email. Emails use branded HTML templates with AccordCRM styling and are sent from a verified organisational email address. The system supports six email types: Welcome, Verification Confirmation, Profile Update, Profile Closure, Account Created, and Account Deleted. If email delivery fails, the system retries the delivery multiple times before routing the failed message to a dead letter queue for investigation. Email delivery failures do not block the agent's action — the underlying operation (client creation, account opening, etc.) completes regardless of email delivery success.

### Data Stored About the Client
The system stores comprehensive personal and financial data for each client, including:
- **Personal information**: First name, last name, date of birth, and gender.
- **Contact information**: Email address and phone number.
- **Identification**: A unique identification number (passport, national ID, or equivalent), limited to 64 characters.
- **Address**: Street address, city, state, country (defaults to Singapore), and postal code.
- **Verification status**: Whether the client has been verified, the verification method used, and the verification timestamp.
- **Assignment**: The unique identifier of the assigned agent.
- **Timestamps**: Record creation date, last update date, and deletion date (if applicable) with deletion reason.

Uniqueness is enforced on email address and identification number across all active (non-deleted) clients. Date of birth is constrained to ensure clients are between 18 and 100 years old.

### Ownership Model
Each client belongs to exactly one agent at any given time. The assigned agent is the only user who can view, edit, verify, or delete the client. Administrators can view all client records in read-only mode and can reassign clients between agents, but they cannot modify any client details beyond the agent assignment. When an agent is deleted, all of their clients are automatically redistributed to the remaining agents to ensure continuity of service.

### What the Client Does NOT Do
- Does not log in to AccordCRM or any associated portal.
- Does not have any authentication credentials in the system.
- Does not view, create, modify, or delete any data within the system.
- Does not access dashboards, reports, activity logs, or AI features.
- Does not initiate any actions — all actions on their behalf are performed by their assigned agent.
- Does not interact with the system beyond receiving automated email notifications.

### Summary
The Client is a passive external stakeholder whose entire relationship with AccordCRM is mediated by their assigned agent. They have no system access and no ability to interact with the application. Their lifecycle — from onboarding to verification to account management to potential offboarding — is managed entirely by their agent, with automated email notifications keeping them informed at each stage. The system stores comprehensive personal and financial data about each client, governed by strict ownership rules that ensure only the assigned agent and read-only administrators can access their records.
