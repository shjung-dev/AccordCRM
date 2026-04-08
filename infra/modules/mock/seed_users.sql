-- =============================================================
-- seed_users.sql  (user_db)
-- Seeds: 2 root admins, 4 admins, 5 agents
--
-- Run against the user-service RDS database.
-- NOTE: The V1 migration already creates one root admin
--       (root@accordcrm.com) with a random UUID. This script
--       uses fixed UUIDs to allow cross-DB referencing.
--
-- Passwords are managed by AWS Cognito, NOT stored in DB.
-- After running this script, create matching Cognito users
-- and update cognito_sub for each user.
--
-- All user passwords in Cognito should be set to: Password123
-- =============================================================

-- =============================================================
-- ROOT ADMINS (2)
-- The V1 migration already inserts root@accordcrm.com.
-- We add one more root admin with a fixed UUID.
-- =============================================================
INSERT INTO public.users (
  user_id, first_name, last_name, email_address,
  is_admin, is_root_admin, phone_number, created_at
) VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Sarah', 'Morrison',
    'sarah.morrison@accordcrm.com',
    true, true,
    '+6591234001',
    '2025-06-01 08:00:00+08'
  )
ON CONFLICT (email_address) DO NOTHING;

-- =============================================================
-- ADMINS (4)
-- is_admin = true, is_root_admin = false
-- =============================================================
INSERT INTO public.users (
  user_id, first_name, last_name, email_address,
  is_admin, is_root_admin, phone_number, created_at
) VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'David', 'Chen',
    'david.chen@accordcrm.com',
    true, false,
    '+6591234011',
    '2025-07-01 09:00:00+08'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Emily', 'Tan',
    'emily.tan@accordcrm.com',
    true, false,
    '+6591234012',
    '2025-07-05 09:00:00+08'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'Marcus', 'Lim',
    'marcus.lim@accordcrm.com',
    true, false,
    '+6591234013',
    '2025-07-10 09:00:00+08'
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'Priya', 'Sharma',
    'priya.sharma@accordcrm.com',
    true, false,
    '+6591234014',
    '2025-08-01 09:00:00+08'
  )
ON CONFLICT (email_address) DO NOTHING;

-- =============================================================
-- AGENTS (5)
-- is_admin = false, is_root_admin = false
-- =============================================================
INSERT INTO public.users (
  user_id, first_name, last_name, email_address,
  is_admin, is_root_admin, phone_number, created_at
) VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'James', 'Wong',
    'james.wong@accordcrm.com',
    false, false,
    '+6591234101',
    '2025-08-15 09:00:00+08'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'Rachel', 'Ng',
    'rachel.ng@accordcrm.com',
    false, false,
    '+6591234102',
    '2025-08-15 09:00:00+08'
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'Ahmad', 'Ibrahim',
    'ahmad.ibrahim@accordcrm.com',
    false, false,
    '+6591234103',
    '2025-08-20 09:00:00+08'
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'Michelle', 'Lee',
    'michelle.lee@accordcrm.com',
    false, false,
    '+6591234104',
    '2025-09-01 09:00:00+08'
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'Daniel', 'Ong',
    'daniel.ong@accordcrm.com',
    false, false,
    '+6591234105',
    '2025-09-01 09:00:00+08'
  )
ON CONFLICT (email_address) DO NOTHING;
