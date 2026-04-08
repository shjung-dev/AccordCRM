#!/usr/bin/env bash
# =============================================================================
# seed-mock-data.sh — Seeds all mock data into the three databases and Cognito.
#
# Prerequisites:
#   - psql installed and accessible
#   - aws CLI configured with appropriate credentials
#   - Environment variables set (see below)
#
# Required environment variables:
#   USER_DB_URL        — PostgreSQL connection string for user-service DB
#   CLIENT_DB_URL      — PostgreSQL connection string for client-service DB
#   ACCOUNT_DB_URL     — PostgreSQL connection string for account-service DB
#   COGNITO_USER_POOL_ID — Cognito User Pool ID
#   COGNITO_REGION     — AWS region (default: ap-southeast-1)
#
# Usage:
#   ./infra/scripts/seed-mock-data.sh          # seed all databases + Cognito
#   ./infra/scripts/seed-mock-data.sh --sql    # seed databases only (skip Cognito)
#   ./infra/scripts/seed-mock-data.sh --cognito # Cognito only (skip SQL)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOCK_DIR="$SCRIPT_DIR/../modules/mock"
REGION="${COGNITO_REGION:-ap-southeast-1}"
PASSWORD="Password123"

SKIP_SQL=false
SKIP_COGNITO=false

case "${1:-}" in
  --sql)     SKIP_COGNITO=true ;;
  --cognito) SKIP_SQL=true ;;
esac

# ---------------------------------------------------------------------------
# Helper: create a Cognito user with permanent password and group membership
# ---------------------------------------------------------------------------
create_cognito_user() {
  local email="$1"
  local first_name="$2"
  local last_name="$3"
  local role="$4"        # "agent" or "admin"
  local is_root="$5"     # "true" or "false"

  echo "  Creating Cognito user: $email ($role, root=$is_root)"

  # Create user (suppress welcome email)
  aws cognito-idp admin-create-user \
    --user-pool-id "$COGNITO_USER_POOL_ID" \
    --username "$email" \
    --user-attributes \
      "Name=email,Value=$email" \
      "Name=email_verified,Value=true" \
      "Name=given_name,Value=$first_name" \
      "Name=family_name,Value=$last_name" \
      "Name=custom:role,Value=$role" \
      "Name=custom:isRootAdmin,Value=$is_root" \
    --message-action SUPPRESS \
    --region "$REGION" \
    --output text > /dev/null 2>&1 || {
      echo "    WARN: User $email may already exist, skipping creation"
    }

  # Set permanent password
  aws cognito-idp admin-set-user-password \
    --user-pool-id "$COGNITO_USER_POOL_ID" \
    --username "$email" \
    --password "$PASSWORD" \
    --permanent \
    --region "$REGION" 2>/dev/null || true

  # Add to role group
  aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$COGNITO_USER_POOL_ID" \
    --username "$email" \
    --group-name "$role" \
    --region "$REGION" 2>/dev/null || true

  # Add to root_admin group if applicable
  if [ "$is_root" = "true" ]; then
    aws cognito-idp admin-add-user-to-group \
      --user-pool-id "$COGNITO_USER_POOL_ID" \
      --username "$email" \
      --group-name "root_admin" \
      --region "$REGION" 2>/dev/null || true
  fi

  # Get the Cognito sub and update the DB
  local sub
  sub=$(aws cognito-idp admin-get-user \
    --user-pool-id "$COGNITO_USER_POOL_ID" \
    --username "$email" \
    --region "$REGION" \
    --query "UserAttributes[?Name=='sub'].Value" \
    --output text 2>/dev/null) || true

  if [ -n "$sub" ] && [ -n "${USER_DB_URL:-}" ]; then
    psql "$USER_DB_URL" -c \
      "UPDATE public.users SET cognito_sub = '$sub' WHERE email_address = '$email';" \
      > /dev/null 2>&1 || true
    echo "    Linked cognito_sub: $sub"
  fi
}

# ---------------------------------------------------------------------------
# Step 1: Seed SQL databases
# ---------------------------------------------------------------------------
if [ "$SKIP_SQL" = false ]; then
  echo "=== Seeding SQL Databases ==="

  if [ -n "${USER_DB_URL:-}" ]; then
    echo "--- Seeding user-service DB ---"
    psql "$USER_DB_URL" -f "$MOCK_DIR/seed_users.sql"
  else
    echo "SKIP: USER_DB_URL not set"
  fi

  if [ -n "${CLIENT_DB_URL:-}" ]; then
    echo "--- Seeding client-service DB ---"
    psql "$CLIENT_DB_URL" -f "$MOCK_DIR/seed_clients.sql"
  else
    echo "SKIP: CLIENT_DB_URL not set"
  fi

  if [ -n "${ACCOUNT_DB_URL:-}" ]; then
    echo "--- Seeding account-service DB ---"
    psql "$ACCOUNT_DB_URL" -f "$MOCK_DIR/seed_mock_accounts.sql"
  else
    echo "SKIP: ACCOUNT_DB_URL not set"
  fi

  echo ""
fi

# ---------------------------------------------------------------------------
# Step 2: Create Cognito users
# ---------------------------------------------------------------------------
if [ "$SKIP_COGNITO" = false ]; then
  if [ -z "${COGNITO_USER_POOL_ID:-}" ]; then
    echo "SKIP: COGNITO_USER_POOL_ID not set — skipping Cognito user creation"
  else
    echo "=== Creating Cognito Users ==="

    echo "--- Root Admins ---"
    create_cognito_user "root@accordcrm.com"           "Root"     "Admin"    "admin" "true"
    create_cognito_user "sarah.morrison@accordcrm.com" "Sarah"    "Morrison" "admin" "true"

    echo "--- Default Accounts ---"
    create_cognito_user "admin@crm.com"                "Admin"    "User"     "admin" "false"
    create_cognito_user "agent1@crm.com"               "Agent"    "One"      "agent" "false"

    echo "--- Admins ---"
    create_cognito_user "david.chen@accordcrm.com"     "David"    "Chen"     "admin" "false"
    create_cognito_user "emily.tan@accordcrm.com"      "Emily"    "Tan"      "admin" "false"
    create_cognito_user "marcus.lim@accordcrm.com"     "Marcus"   "Lim"      "admin" "false"
    create_cognito_user "priya.sharma@accordcrm.com"   "Priya"    "Sharma"   "admin" "false"

    echo "--- Agents ---"
    create_cognito_user "james.wong@accordcrm.com"     "James"    "Wong"     "agent" "false"
    create_cognito_user "rachel.ng@accordcrm.com"      "Rachel"   "Ng"       "agent" "false"
    create_cognito_user "ahmad.ibrahim@accordcrm.com"  "Ahmad"    "Ibrahim"  "agent" "false"
    create_cognito_user "michelle.lee@accordcrm.com"   "Michelle" "Lee"      "agent" "false"
    create_cognito_user "daniel.ong@accordcrm.com"     "Daniel"   "Ong"      "agent" "false"

    echo ""
  fi
fi

echo "=== Mock Data Seeding Complete ==="
echo ""
echo "Summary:"
echo "  Root Admins:  2 (including existing root@accordcrm.com)"
echo "  Default Admin: 1 (admin@crm.com)"
echo "  Default Agent: 1 (agent1@crm.com)"
echo "  Admins:       4"
echo "  Agents:       5"
echo "  Clients:      50"
echo "  Accounts:     56"
echo ""
echo "All user passwords: $PASSWORD"
echo "See infra/modules/mock/CREDENTIALS.md for full details."
