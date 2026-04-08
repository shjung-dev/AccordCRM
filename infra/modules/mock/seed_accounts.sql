-- =============================================================
-- seed_accounts.sql
-- Seeds accounts into account_transaction_db so that the
-- transactions.csv uploaded via SFTP can satisfy the FK:
--   transactions.account_id -> accounts.account_id
--
-- Run this against the account-service RDS BEFORE uploading
-- the mock transactions.csv via SFTP.
--
-- UUIDs match those in sftp_server/user_data.sh.tpl
-- =============================================================

-- Shared placeholder branch ID for mock data
-- Replace with a real branch_id if branch validation is enforced at the app layer.
\set mock_branch_id '\'00000000-0000-0000-0000-000000000099\''

INSERT INTO public.accounts (
    account_id,
    client_id,
    account_type,
    account_status,
    opening_date,
    balance,
    currency,
    branch_id
) VALUES
    -- Client 1 accounts
    (
        '00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000001',
        'Savings',
        'Active',
        '2024-01-01',
        10000.00,
        'SGD',
        '00000000-0000-0000-0000-000000000099'
    ),
    (
        '00000000-0000-0000-0000-000000000012',
        '00000000-0000-0000-0000-000000000001',
        'Checking',
        'Active',
        '2024-01-01',
        5000.00,
        'SGD',
        '00000000-0000-0000-0000-000000000099'
    ),
    -- Client 2 accounts
    (
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000002',
        'Savings',
        'Active',
        '2024-03-01',
        25000.00,
        'SGD',
        '00000000-0000-0000-0000-000000000099'
    ),
    (
        '00000000-0000-0000-0000-000000000022',
        '00000000-0000-0000-0000-000000000002',
        'Business',
        'Active',
        '2024-03-01',
        50000.00,
        'SGD',
        '00000000-0000-0000-0000-000000000099'
    )
ON CONFLICT (account_id) DO NOTHING;
