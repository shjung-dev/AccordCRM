-- =============================================================
-- V4__default_accounts.sql  (user_db)
-- Default evaluation accounts: one administrator, one agent.
-- Passwords are managed by AWS Cognito and must not be stored here.
-- UUIDs are fixed so Cognito sub linkage is deterministic.
-- =============================================================

INSERT INTO public.users (user_id, first_name, last_name, email_address, is_admin, is_root_admin)
VALUES
  -- Default administrator account
  ('c0000001-0000-0000-0000-000000000001', 'Admin', 'User',  'admin@crm.com',  true,  false),

  -- Default agent account
  ('c0000002-0000-0000-0000-000000000001', 'Agent', 'One',   'agent1@crm.com', false, false)
ON CONFLICT (email_address) DO NOTHING;
