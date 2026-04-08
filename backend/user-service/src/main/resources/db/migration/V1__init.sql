-- =============================================================
-- V1__init.sql  (user_db)
-- Tables: users
-- Seed:   root admin user
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- TABLE: users
-- =============================================================
CREATE TABLE public.users (
  user_id          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  first_name       character varying        NOT NULL,
  last_name        character varying        NOT NULL,
  email_address    character varying        NOT NULL UNIQUE
                     CHECK (email_address ~* '^[^@]+@[^@]+\.[^@]+$'),
  is_admin         boolean                  NOT NULL DEFAULT false,
  is_root_admin    boolean                  NOT NULL DEFAULT false,
  created_at       timestamp with time zone NOT NULL DEFAULT now(),
  phone_number     character varying
                     CHECK (phone_number IS NULL
                            OR phone_number ~ '^[0-9+(). -]{7,20}$'),
  deleted_at       timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (user_id)
);

-- =============================================================
-- SEED: Root admin user
-- Change email and phone before deploying to production.
-- =============================================================
INSERT INTO public.users (
  user_id,
  first_name,
  last_name,
  email_address,
  is_admin,
  is_root_admin,
  phone_number
)
VALUES (
  gen_random_uuid(),
  'Root',
  'Admin',
  'root@accordcrm.com',
  true,
  true,
  NULL
);
