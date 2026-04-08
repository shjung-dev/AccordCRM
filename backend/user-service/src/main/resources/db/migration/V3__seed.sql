-- =============================================================
-- V3__seed.sql  (user_db)
-- Seed: 2 admins + 3 agents with fixed UUIDs.
-- UUIDs must match assigned_agent_id values in client-service V2__seed.sql.
-- =============================================================

INSERT INTO public.users (user_id, first_name, last_name, email_address, is_admin, is_root_admin, phone_number)
VALUES
  -- Admins
  ('ad000001-0000-0000-0000-000000000001', 'Diana',   'Lim',  'diana.lim@accordcrm.com',   true,  false, '+6591000001'),
  ('ad000001-0000-0000-0000-000000000002', 'Ethan',   'Ng',   'ethan.ng@accordcrm.com',    true,  false, '+6591000002'),

  -- Agents
  ('a0000001-0000-0000-0000-000000000001', 'Alice',   'Wong', 'alice.wong@accordcrm.com',  false, false, '+6591000011'),
  ('a0000001-0000-0000-0000-000000000002', 'Bob',     'Tan',  'bob.tan@accordcrm.com',     false, false, '+6591000012'),
  ('a0000001-0000-0000-0000-000000000003', 'Charlie', 'Lee',  'charlie.lee@accordcrm.com', false, false, '+6591000013')
ON CONFLICT (email_address) DO NOTHING;
