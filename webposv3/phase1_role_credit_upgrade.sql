-- Role + customer credit additions
-- Run after phase1_schema_upgrade.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.customer_credits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name text NOT NULL,
  contact_number text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  note text,
  promise_to_pay_date date,
  is_paid boolean NOT NULL DEFAULT false,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_credits
  ADD COLUMN IF NOT EXISTS contact_number text,
  ADD COLUMN IF NOT EXISTS promise_to_pay_date date,
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_credits_payment_status_check'
  ) THEN
    ALTER TABLE public.customer_credits
      ADD CONSTRAINT customer_credits_payment_status_check
      CHECK (payment_status IN ('pending', 'paid', 'overdue'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS customer_credits_branch_created_at_idx
  ON public.customer_credits (branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS customer_credits_customer_name_idx
  ON public.customer_credits (customer_name);

CREATE INDEX IF NOT EXISTS customer_credits_contact_number_idx
  ON public.customer_credits (contact_number);

CREATE INDEX IF NOT EXISTS customer_credits_promise_to_pay_date_idx
  ON public.customer_credits (promise_to_pay_date);

CREATE OR REPLACE FUNCTION public.set_customer_credit_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_paid THEN
    NEW.payment_status := 'paid';
  ELSIF NEW.promise_to_pay_date IS NOT NULL AND NEW.promise_to_pay_date < CURRENT_DATE THEN
    NEW.payment_status := 'overdue';
  ELSE
    NEW.payment_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_customer_credit_status ON public.customer_credits;
CREATE TRIGGER trg_set_customer_credit_status
BEFORE INSERT OR UPDATE ON public.customer_credits
FOR EACH ROW
EXECUTE FUNCTION public.set_customer_credit_status();

UPDATE public.customer_credits
SET payment_status = 'overdue'
WHERE is_paid = false
  AND promise_to_pay_date IS NOT NULL
  AND promise_to_pay_date < CURRENT_DATE
  AND payment_status <> 'overdue';

ALTER TABLE public.customer_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_credits_select_policy ON public.customer_credits;
CREATE POLICY customer_credits_select_policy
ON public.customer_credits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR p.branch_id = customer_credits.branch_id
      )
  )
);

DROP POLICY IF EXISTS customer_credits_insert_policy ON public.customer_credits;
CREATE POLICY customer_credits_insert_policy
ON public.customer_credits
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
        OR p.branch_id = customer_credits.branch_id
      )
  )
);

DROP POLICY IF EXISTS customer_credits_update_policy ON public.customer_credits;
CREATE POLICY customer_credits_update_policy
ON public.customer_credits
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR customer_credits.created_by = auth.uid()
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
        OR customer_credits.created_by = auth.uid()
      )
  )
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_select_policy ON public.sales;
CREATE POLICY sales_select_policy
ON public.sales
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR p.branch_id = sales.branch_id
      )
  )
);

DROP POLICY IF EXISTS sales_insert_policy ON public.sales;
CREATE POLICY sales_insert_policy
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR p.branch_id = sales.branch_id
      )
  )
);

DROP POLICY IF EXISTS sales_update_policy ON public.sales;
CREATE POLICY sales_update_policy
ON public.sales
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR p.branch_id = sales.branch_id
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
        OR p.branch_id = sales.branch_id
      )
  )
);

DROP POLICY IF EXISTS sale_items_select_policy ON public.sale_items;
CREATE POLICY sale_items_select_policy
ON public.sale_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sales s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = sale_items.sale_id
      AND (
        p.role = 'admin'
        OR p.branch_id = s.branch_id
      )
  )
);

DROP POLICY IF EXISTS sale_items_insert_policy ON public.sale_items;
CREATE POLICY sale_items_insert_policy
ON public.sale_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sales s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = sale_items.sale_id
      AND (
        p.role = 'admin'
        OR p.branch_id = s.branch_id
      )
  )
);

DROP POLICY IF EXISTS payments_select_policy ON public.payments;
CREATE POLICY payments_select_policy
ON public.payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sales s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = payments.sale_id
      AND (
        p.role = 'admin'
        OR p.branch_id = s.branch_id
      )
  )
);

DROP POLICY IF EXISTS payments_insert_policy ON public.payments;
CREATE POLICY payments_insert_policy
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sales s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = payments.sale_id
      AND (
        p.role = 'admin'
        OR p.branch_id = s.branch_id
      )
  )
);

COMMIT;

