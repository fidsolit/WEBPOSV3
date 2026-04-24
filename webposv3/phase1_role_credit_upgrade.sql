-- Role + customer credit additions
-- Run after phase1_schema_upgrade.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.customer_credits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  note text,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_credits_branch_created_at_idx
  ON public.customer_credits (branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS customer_credits_customer_name_idx
  ON public.customer_credits (customer_name);

COMMIT;

