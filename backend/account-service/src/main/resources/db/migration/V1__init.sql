-- =============================================================
-- V1__init.sql  (account_transaction_db)
-- Tables: accounts, transactions, activity_logs
--
-- NOTE: Cross-database foreign keys are not supported in PostgreSQL.
--   accounts.client_id    → clients.client_id   (enforced at application level)
--   transactions.client_id → clients.client_id  (enforced at application level)
--   activity_logs.user_id  → users.user_id      (enforced at application level)
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- TABLE: accounts
-- FK to clients removed (cross-DB) — enforced at application level
-- =============================================================
CREATE TABLE public.accounts (
  account_id          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  client_id           uuid                     NOT NULL,
  account_type        character varying        NOT NULL
                        CHECK (account_type IN ('Checking', 'Savings', 'Business')),
  account_status      character varying        NOT NULL
                        CHECK (account_status IN ('Active', 'Inactive', 'Pending')),
  opening_date        date                     NOT NULL,
  balance             numeric                  NOT NULL DEFAULT 0,
  currency            character(3)             NOT NULL
                        CHECK (currency ~ '^[A-Z]{3}$'),
  branch_id           uuid                     NOT NULL,
  created_at          timestamp with time zone NOT NULL DEFAULT now(),
  verification_status character varying,
  assigned_agent_id   uuid,
  CONSTRAINT accounts_pkey PRIMARY KEY (account_id)
);

-- =============================================================
-- TABLE: transactions
-- FK to clients removed (cross-DB) — enforced at application level
-- FK to accounts kept (same database)
-- =============================================================
CREATE TABLE public.transactions (
  transaction_id   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  client_id        uuid                     NOT NULL,
  account_id       uuid                     NOT NULL,
  correlation_id   uuid,
  idempotency_key  uuid                     NOT NULL UNIQUE,
  transaction_type character(1)             NOT NULL
                     CHECK (transaction_type IN ('D', 'W')),
  currency         character(3)             NOT NULL
                     CHECK (currency ~ '^[A-Z]{3}$'),
  amount           numeric                  NOT NULL CHECK (amount > 0),
  status           character varying        NOT NULL
                     CHECK (status IN ('Pending', 'Completed', 'Failed')),
  failure_reason   text,
  created_at       timestamp with time zone NOT NULL DEFAULT now(),
  updated_at       timestamp with time zone NOT NULL DEFAULT now(),
  description      text,
  CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id)
    REFERENCES public.accounts (account_id)
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX idx_accounts_client_id     ON public.accounts    (client_id);
CREATE INDEX idx_accounts_branch_id     ON public.accounts    (branch_id);
CREATE INDEX idx_transactions_client_id ON public.transactions (client_id);
CREATE INDEX idx_transactions_account   ON public.transactions (account_id);
CREATE INDEX idx_transactions_status    ON public.transactions (status);
