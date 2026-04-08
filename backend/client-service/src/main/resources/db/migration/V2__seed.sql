-- =============================================================
-- V2__seed.sql  (client_db)
-- Seed: 5 clients with fixed UUIDs.
-- assigned_agent_id values must match user_id values in user-service V3__seed.sql.
-- client_id values must match client-service V2__seed.sql references in account-service V2__seed.sql.
-- =============================================================

INSERT INTO public.clients (
  client_id,
  first_name, last_name,
  date_of_birth, gender,
  email_address, phone_number,
  address, city, state, country, postal_code,
  identification_number,
  assigned_agent_id,
  verified_at, verification_method
)
VALUES
  (
    'c0000001-0000-0000-0000-000000000001',
    'James', 'Chen',
    '1985-03-12', 'Male',
    'james.chen@example.com', '+6581000001',
    '10 Orchard Road #05-01', 'Singapore', 'Singapore', 'Singapore', '238841',
    'S8512345A',
    'a0000001-0000-0000-0000-000000000001',
    now(), 'Manual'
  ),
  (
    'c0000001-0000-0000-0000-000000000002',
    'Sarah', 'Patel',
    '1990-07-22', 'Female',
    'sarah.patel@example.com', '+6581000002',
    '25 Marina Boulevard #10-02', 'Singapore', 'Singapore', 'Singapore', '018980',
    'S9034567B',
    'a0000001-0000-0000-0000-000000000001',
    now(), 'Manual'
  ),
  (
    'c0000001-0000-0000-0000-000000000003',
    'Michael', 'Tan',
    '1978-11-05', 'Male',
    'michael.tan@example.com', '+6581000003',
    '88 Tanjong Pagar Road #03-01', 'Singapore', 'Singapore', 'Singapore', '088503',
    'S7898765C',
    'a0000001-0000-0000-0000-000000000002',
    now(), 'Manual'
  ),
  (
    'c0000001-0000-0000-0000-000000000004',
    'Emily', 'Lim',
    '1995-01-30', 'Female',
    'emily.lim@example.com', '+6581000004',
    '3 HarbourFront Place #08-08', 'Singapore', 'Singapore', 'Singapore', '099254',
    'S9512345D',
    'a0000001-0000-0000-0000-000000000002',
    now(), 'Manual'
  ),
  (
    'c0000001-0000-0000-0000-000000000005',
    'David', 'Park',
    '1982-09-18', 'Male',
    'david.park@example.com', '+6581000005',
    '1 Raffles Quay #20-01', 'Singapore', 'Singapore', 'Singapore', '048583',
    'S8254321E',
    'a0000001-0000-0000-0000-000000000003',
    now(), 'Manual'
  )
ON CONFLICT (client_id) DO NOTHING;
