-- =============================================================
-- V1__init.sql  (client_db)
-- Tables: clients
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- TABLE: clients
-- =============================================================
CREATE TABLE public.clients (
  client_id             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  first_name            character varying        NOT NULL,
  last_name             character varying        NOT NULL,
  date_of_birth         date                     NOT NULL
                          CHECK (date_of_birth <= (CURRENT_DATE - '18 years'::interval)
                             AND date_of_birth >= (CURRENT_DATE - '100 years'::interval)),
  gender                character varying        NOT NULL
                          CHECK (gender IN ('Male', 'Female', 'Non-binary', 'Prefer not to say')),
  email_address         text                     NOT NULL UNIQUE
                          CHECK (email_address ~* '^[^@]+@[^@]+\.[^@]+$'),
  phone_number          character varying        NOT NULL
                          CHECK (phone_number ~ '^\+?[0-9]{8,15}$'),
  address               character varying        NOT NULL
                          CHECK (char_length(address) >= 5 AND char_length(address) <= 100),
  city                  character varying        NOT NULL
                          CHECK (char_length(city) >= 2 AND char_length(city) <= 50),
  state                 character varying        NOT NULL
                          CHECK (char_length(state) >= 2 AND char_length(state) <= 50),
  country               character varying        NOT NULL DEFAULT 'Singapore'
                          CHECK (char_length(country) >= 2 AND char_length(country) <= 50),
  postal_code           character varying        NOT NULL
                          CHECK (char_length(postal_code) >= 4 AND char_length(postal_code) <= 10),
  verified_at           timestamp with time zone,
  verification_method   character varying,
  created_at            timestamp with time zone NOT NULL DEFAULT now(),
  updated_at            timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at            timestamp with time zone,
  assigned_agent_id     uuid,
  deletion_reason       character varying,
  identification_number character varying        NOT NULL UNIQUE,
  CONSTRAINT clients_pkey PRIMARY KEY (client_id)
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX idx_clients_email          ON public.clients (email_address);
CREATE INDEX idx_clients_identification ON public.clients (identification_number);
CREATE INDEX idx_clients_assigned_agent ON public.clients (assigned_agent_id);
