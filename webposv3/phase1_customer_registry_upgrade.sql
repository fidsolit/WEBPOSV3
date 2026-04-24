-- Customer registry table
-- Run after phase1_schema_upgrade.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  contact_number text,
  notes text,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_branch_full_name_idx
  ON public.customers (branch_id, full_name);

CREATE INDEX IF NOT EXISTS customers_contact_number_idx
  ON public.customers (contact_number);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_select_policy ON public.customers;
CREATE POLICY customers_select_policy
ON public.customers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR p.branch_id = customers.branch_id
      )
  )
);

DROP POLICY IF EXISTS customers_insert_policy ON public.customers;
CREATE POLICY customers_insert_policy
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR p.branch_id = customers.branch_id
      )
  )
);

DROP POLICY IF EXISTS customers_update_policy ON public.customers;
CREATE POLICY customers_update_policy
ON public.customers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR p.branch_id = customers.branch_id
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR p.branch_id = customers.branch_id
      )
  )
);

COMMIT;

