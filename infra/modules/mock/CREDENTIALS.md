# AccordCRM Mock User Credentials

All users below use the same password for login.

> **Password:** `Password123`

Passwords are managed by AWS Cognito. After running the SQL seed scripts,
you must create matching Cognito users with this password and update
each user's `cognito_sub` in the database.

---

## Root Admins

| Name | Email | Role |
|------|-------|------|
| Root Admin | root@accordcrm.com | Root Admin |
| Sarah Morrison | sarah.morrison@accordcrm.com | Root Admin |

## Admins

| Name | Email | Role |
|------|-------|------|
| David Chen | david.chen@accordcrm.com | Admin |
| Emily Tan | emily.tan@accordcrm.com | Admin |
| Marcus Lim | marcus.lim@accordcrm.com | Admin |
| Priya Sharma | priya.sharma@accordcrm.com | Admin |

## Agents

| Name | Email | Role | Clients Assigned |
|------|-------|------|-----------------|
| James Wong | james.wong@accordcrm.com | Agent | 14 |
| Rachel Ng | rachel.ng@accordcrm.com | Agent | 12 |
| Ahmad Ibrahim | ahmad.ibrahim@accordcrm.com | Agent | 10 |
| Michelle Lee | michelle.lee@accordcrm.com | Agent | 8 |
| Daniel Ong | daniel.ong@accordcrm.com | Agent | 6 |

---

## Execution Order

Run the SQL seed scripts in this order against the correct databases:

```bash
# 1. User DB (user-service)
psql -h <USER_DB_HOST> -U <USER_DB_USER> -d <USER_DB_NAME> -f seed_users.sql

# 2. Client DB (client-service)
psql -h <CLIENT_DB_HOST> -U <CLIENT_DB_USER> -d <CLIENT_DB_NAME> -f seed_clients.sql

# 3. Account DB (account-service)
psql -h <ACCOUNT_DB_HOST> -U <ACCOUNT_DB_USER> -d <ACCOUNT_DB_NAME> -f seed_mock_accounts.sql

# 4. Create Cognito users (for each user above)
aws cognito-idp admin-create-user \
  --user-pool-id <POOL_ID> \
  --username <email> \
  --user-attributes Name=email,Value=<email> Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id <POOL_ID> \
  --username <email> \
  --password "Password123" \
  --permanent

# Add to appropriate Cognito group (agent / admin / root_admin)
aws cognito-idp admin-add-user-to-group \
  --user-pool-id <POOL_ID> \
  --username <email> \
  --group-name <group>

# 5. Update cognito_sub in user DB
# Get the sub from: aws cognito-idp admin-get-user --user-pool-id <POOL_ID> --username <email>
# UPDATE users SET cognito_sub = '<sub>' WHERE email_address = '<email>';
```
