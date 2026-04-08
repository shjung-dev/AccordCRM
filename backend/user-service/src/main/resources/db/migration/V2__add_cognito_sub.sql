-- V2__add_cognito_sub.sql
-- Adds cognito_sub to link Cognito identity to DB users.
-- New users get this populated automatically on creation.
-- Existing users (e.g. root admin) must be updated manually:
--   UPDATE users SET cognito_sub = '<sub-from-jwt>' WHERE email_address = 'root@accordcrm.com';

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cognito_sub varchar UNIQUE;
