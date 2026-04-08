# Project Requirements Baseline (Source of Truth)

## 1) Scope and Objective
- System: CRM for Scrooge Global Bank.
- Objective: Build a CRM architecture that is easy to use, secure, scalable, and able to handle high transaction volume while preserving data integrity and regulatory compliance.
- Design intent: cloud-native, data-centric, client-focused, secure, modular, automated, accessible, and sustainable.
- System stores:
  - Agent
  - Client and Account
  - Log
  - Transaction
- Transaction logs are retrieved from an SFTP location (mainframe-origin logs). Teams must provide a mock SFTP server.
- Frontend scope covers Feature 1 to Feature 4 and should prioritize functionality and usability over visual complexity.

## 2) Roles and Access Rules
- `admin`: account management role.
- `agent`: user role for creating client profiles and accounts; access limited to own clients.
- Root admin rule:
  - Root administrator cannot be deleted.
  - Other admins can be created and deleted as needed.
- Admin dashboard access rule:
  - Agents can only see their own client activities.
  - Admins can see activities of all agents.

## 3) Feature 1: CRM User Management
Purpose: secure and seamless user enrollment and authentication.

APIs:
- Create User
- Disable User
- Update User
- Authenticate User
- Reset Password

Security requirements:
- Use OAuth 2.0 for authentication and authorization.
- Follow Zero Trust: all service requests must validate OAuth2-based token authenticity and authorization.
- MFA is good-to-have.
- Passwords must be stored using hashing algorithms.

## 4) Feature 2: Client Profile Management
Purpose: manage client account information.

Components:
- Client Database: personal details, account status, interaction history.
- Account Database: account details for a client.

Actions and endpoints:
1. Create Client Profile
- Endpoint: `POST /api/clients`
- Flow: agent fills form, system validates, system assigns Client ID, profile is stored, log entry is created.

2. Verify Client Identity
- Endpoint: `POST /api/clients/{clientId}/verify`
- Flow: system sends verification request, client provides identification documents (identification number), system validates documents against provided information, verification status is updated, log entry is created.

3. Update Client Information
- Endpoint: `PUT /api/clients/{clientId}`
- Flow: system receives update request, validates new information, updates profile, log entry is created.

4. Get Client Profile
- Endpoint: `GET /api/clients/{clientId}`
- Flow: system receives view request, fetches profile, returns profile, log entry is created.

5. Delete Client Profile
- Endpoint: `DELETE /api/clients/{clientId}`
- Flow: system receives delete request, verifies request, deletes profile, log entry is created.

6. Create Account
- Endpoint: `POST /api/accounts`
- Flow: agent fills onboarding form, system validates, system assigns Account ID, account is stored, log entry is created.

7. Delete Account
- Endpoint: `DELETE /api/accounts/{accountId}`
- Flow: system receives delete request, verifies request, deletes account, log entry is created.

Data and controls:
- Client Database uses a relational database with ACID properties.
- CRM supports CRUD interaction types and stores metadata for each interaction.
- Validation checks and business rules are required to preserve data integrity.
- Data must be encrypted at rest and in transit.
- Audit trails must track changes to client data.

## 5) Feature 3: Logging of Agent Interactions and Client Communications
Purpose: track client-related transactions and communications.

Components:
- Transaction Database: stores transaction details.
- Transaction Processing: handles transaction create/update/delete.

Business transaction areas:
1. Client Profile Management
- Focus: Client ID, name, contact details, address.
- Example: create/update/delete client profiles.
- API note: internal APIs.

2. Client Communication
- Includes create/update/get details/delete transaction flows.
- Uses email for client communication.
- Sends email notifications to clients (Feature 2 create/disable/update/#1 reference).
- Communication APIs: Create Communication, Get Communication Status.

Operational constraints:
- Optional: rollback mechanism for transaction failures; team should explain method and frequency.
- Performance targets:
  - Minimum 100 concurrent agents.
  - Frontend latency must not exceed 5 seconds.

## 6) Feature 4: Bank Account Transactions Management
- Core banking is a separate mainframe application.
- CRM ingests account transaction information from external SFTP and populates its own `Transaction` table.

Required tasks:
1. Create dummy data based on Appendix 2 fields.
2. Implement an external SFTP server for CRM transaction ingestion.

## 7) Feature 5: Mandatory X-Factor
- Implement a CRM-related feature beyond Features 1 to 4 that improves user experience, productivity, or system intelligence.

Example APIs/components:
- `POST /api/query`: natural-language questions from admin or agent.
- `POST /api/generate`: AI-assisted content (emails, summaries, recommendations, insights).

X-Factor constraints:
- May use advanced capabilities such as AI/LLMs.
- Must provide clear value to CRM users.
- Must be fully implemented and integrated end-to-end.
- AI-generated outputs require human review/confirmation before action.
- Must follow digital principles: cloud-native, modular, secure, explainable.

## 8) Non-Functional Requirements
Implementation rule:
- Teams must implement items 1 to 3 (mandatory) and may implement the rest.

1. Scalability/Performance (mandatory)
- Auto-scaling for application and database layers.
- Load balancing across instances.
- Caching where needed.

2. Availability (mandatory)
- Redundancy and failover.
- Multiple availability zones; cross-region if needed.
- Robust backup and restore strategy.

3. Maintainability/Extensibility (mandatory)
- Modular components for easy feature additions.
- API-based external integrations.
- Backward compatibility for new features and API evolution.

4. Consistency
- Strong consistency where required.
- Eventual consistency for read-heavy scenarios where immediate consistency is not critical.

5. Resiliency
- Graceful failure handling (for example: circuit breakers, retries).
- Disaster recovery with recommended RTO = 12 hours and RPO = 12 hours.
- Fault-tolerant architecture.

6. Usability
- Intuitive and accessible UI.
- Comprehensive documentation and user guides.
- User testing to identify/fix usability issues.

7. Observability
- Comprehensive monitoring and logging.
- Metrics and dashboards.
- Alerting for proactive issue resolution.

8. Security
- Multi-layer security (firewalls, encryption, intrusion detection).
- Regular security audits and penetration testing.
- Compliance alignment (for example: GDPR, PCI-DSS).
- PII must be encrypted or filtered in logs.
- GDPR right-to-erasure support.
- APIs should be designed using OpenAPI standards.

9. Durability
- Durable storage with replication and backup.
- Data retention policies.
- No data loss during failures or updates.

10. Agility
- Agile development methods.
- CI/CD for automated testing and deployment (demo CI/CD).
- Continuous improvement and innovation.

11. Architecture
- Layered architecture with presentation/domain separation.
- Cloud-native application design.
- Optional modularization via microservices or micro-frontends by domain context.

12. Data Segregation
- Country/legal-entity data protection policies must be respected.
- Data must not be shared across legal entities.
- Hosting must be separated by legal-entity requirements; each instance processes only its legal-entity data.

13. Automated Testing
- Application must be capable of automated testing.

## 9) Digital Principles
1. Cloud Native First
2. Do Less - Reuse, Build
3. Data Centric, Client Focused, and Predictive
4. Zero Trust Security
5. Open, Modular, and Unbundled
6. Automated By Design
7. All Services Any Channel
8. All Services, Always Available
9. Simple, Reliable and Accessible, for Everyone
10. Ethical, Explainable, and Sustainable

## 10) Attributes and Validation Rules
### 10.1 User (Feature 1)
- ID: unique user ID.
- First Name: user first name.
- Last Name: user last name.
- Email: user email.
- Role: Admin or Agent.

### 10.2 Client (Feature 2)
Fields:
- Client ID
- First Name
- Last Name
- Date of Birth
- Gender
- Email Address
- Phone Number
- Address
- City
- State
- Country
- Postal Code

Validation and business rules:
- Client ID
  - Type: String
  - Validation: system-generated, unique, non-editable
  - Business rule: must be unique across the system
- First Name
  - Type: String
  - Validation: required, min 2, max 50
  - Business rule: alphabetic characters and spaces only
- Last Name
  - Type: String
  - Validation: required, min 2, max 50
  - Business rule: alphabetic characters and spaces only
- Date of Birth
  - Type: Date
  - Validation: required, valid date, must be in the past
  - Business rule: age between 18 and 100
- Gender
  - Type: String
  - Validation: required, one of: Male, Female, Non-binary, prefer not to say
- Email Address
  - Type: String
  - Validation: required, valid email format
  - Business rule: must be unique across the system
- Phone Number
  - Type: String
  - Validation: required, valid phone format (example `+1234567890`), min 10 digits, max 15 digits
- Address
  - Type: String
  - Validation: required, min 5, max 100
  - Business rule: must be unique across the system
- City
  - Type: String
  - Validation: required, min 2, max 50
- State
  - Type: String
  - Validation: required, min 2, max 50
- Country
  - Type: String
  - Validation: required, min 2, max 50
- Postal Code
  - Type: String
  - Validation: required, valid postal code format, min 4, max 10
  - Business rule: must match the country postal code format

### 10.3 Account (Feature 2)
- Account ID: unique auto-generated identifier.
- Client ID: linked client identifier.
- Account Type: for example Savings, Checking, Business.
- Account Status: for example Active, Inactive, Pending.
- Opening Date.
- Initial Deposit.
- Currency: SGD for Singapore Dollar.
- Branch ID.

### 10.4 Log (Feature 3)
- CRUD action: Create, Read, Update, Delete.
- Attribute name behavior:
  - For Create/Read/Delete, store Client ID.
  - For Update, store the attribute.
- Before Value (example: `LEE|ABC`).
- After Value (example: `TAN|XX`).
- Agent ID.
- Client ID.
- DateTime in ISO 8601 format.

### 10.5 Transaction (Feature 4)
- ID: transaction ID.
- Client ID.
- Transaction: Deposit or Withdrawal.
- Amount.
- Date.
- Status: Completed, Pending, Failed.

## 11) UI Pages and Visibility Rules
Pages:
- Login Page
- Admin Dashboard
- Admin Manage Account
- Agent Dashboard
- Agent Creates Client Profile
- Agent Views Transactions

Visibility notes:
- Agents can only see their own client activities.
- Admins can see activities of all agents.

## 12) Governance for This File
- This markdown file is the working source of truth for implementation within this project workspace.
- Any requirement change should be applied here first.
- If future clarifications (for example Q&A updates) are adopted, they must be explicitly added to this file under a dated change note before implementation.
