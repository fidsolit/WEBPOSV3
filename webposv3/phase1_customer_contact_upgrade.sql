-- Customer contact detail enhancement
-- Run after phase1_customer_registry_upgrade.sql

BEGIN;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text;

CREATE INDEX IF NOT EXISTS customers_email_idx
  ON public.customers (email);

COMMIT;
