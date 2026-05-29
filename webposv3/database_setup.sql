-- WebPOS V3 consolidated database setup
-- Replaces the legacy fragmented SQL migration files in this repository.
-- Safe to review and apply in Supabase SQL Editor for existing environments.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------
-- 0) Base tables required for fresh installs
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL DEFAULT 'cashier'
    CHECK (role IN ('admin', 'cashier', 'user')),
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  barcode text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  method text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = check_user_id
      AND role = 'admin'
  );
END;
$$;

-- -----------------------------
-- 1) Profiles + auth trigger
-- -----------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;

UPDATE public.profiles
SET is_approved = true
WHERE role = 'admin';

UPDATE public.profiles
SET is_approved = true
WHERE role = 'cashier'
  AND is_approved IS DISTINCT FROM true;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.on_auth_user_created();

CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
  resolved_name text;
BEGIN
  resolved_name := COALESCE(new.raw_user_meta_data->>'full_name', new.email);

  INSERT INTO public.profiles (id, full_name, role, is_approved)
  VALUES (
    new.id,
    resolved_name,
    'cashier',
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in on_auth_user_created: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.on_auth_user_created();

CREATE INDEX IF NOT EXISTS profiles_role_is_approved_idx
  ON public.profiles (role, is_approved);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
);

-- -----------------------------
-- 2) Products, inventory, sales, payments
-- -----------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 10;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_price_nonnegative'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_price_nonnegative CHECK (price >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_cost_nonnegative'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_cost_nonnegative CHECK (cost >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_barcode_idx
  ON public.products (barcode)
  WHERE barcode IS NOT NULL;

DO $$
DECLARE
  has_duplicates boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.products
    WHERE barcode IS NOT NULL
    GROUP BY barcode
    HAVING COUNT(*) > 1
  )
  INTO has_duplicates;

  IF NOT has_duplicates THEN
    CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_unique_not_null_idx
      ON public.products (barcode)
      WHERE barcode IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skipped UNIQUE barcode index because duplicate barcodes exist in public.products.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_branch_product_unique_idx
  ON public.inventory (branch_id, product_id);

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS min_stock integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_stock_nonnegative'
  ) THEN
    ALTER TABLE public.inventory
      ADD CONSTRAINT inventory_stock_nonnegative CHECK (stock >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  movement_type text NOT NULL
    CHECK (movement_type IN ('sale', 'restock', 'adjustment', 'transfer_in', 'transfer_out', 'void_restore')),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(12,2),
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_branch_created_at_idx
  ON public.stock_movements (branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS stock_movements_product_created_at_idx
  ON public.stock_movements (product_id, created_at DESC);

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS receipt_no text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('saved', 'completed', 'void')),
  ADD COLUMN IF NOT EXISTS subtotal numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type text
    CHECK (discount_type IN ('percent', 'fixed')),
  ADD COLUMN IF NOT EXISTS discount_value numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_total numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS voided_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS offline_origin text,
  ADD COLUMN IF NOT EXISTS local_ref text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_total_nonnegative'
  ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_total_nonnegative CHECK (total >= 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS sales_receipt_no_unique_idx
  ON public.sales (receipt_no)
  WHERE receipt_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS sales_branch_created_at_idx
  ON public.sales (branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sales_user_created_at_idx
  ON public.sales (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sales_status_created_at_idx
  ON public.sales (status, created_at DESC);

CREATE INDEX IF NOT EXISTS sales_local_ref_idx
  ON public.sales (local_ref)
  WHERE local_ref IS NOT NULL;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2),
  ADD COLUMN IF NOT EXISTS line_subtotal numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_line_total numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_name text,
  ADD COLUMN IF NOT EXISTS note text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sale_items_quantity_positive'
  ) THEN
    ALTER TABLE public.sale_items
      ADD CONSTRAINT sale_items_quantity_positive CHECK (quantity > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sale_items_price_nonnegative'
  ) THEN
    ALTER TABLE public.sale_items
      ADD CONSTRAINT sale_items_price_nonnegative CHECK (price >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx
  ON public.sale_items (sale_id);

CREATE INDEX IF NOT EXISTS sale_items_product_id_idx
  ON public.sale_items (product_id);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reference_no text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'posted'
    CHECK (status IN ('posted', 'void')),
  ADD COLUMN IF NOT EXISTS note text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_amount_nonnegative'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_amount_nonnegative CHECK (amount >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS payments_sale_id_idx
  ON public.payments (sale_id);

CREATE INDEX IF NOT EXISTS payments_method_created_at_idx
  ON public.payments (method, created_at DESC);

CREATE TABLE IF NOT EXISTS public.saved_carts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  customer_name text,
  cart_name text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_type text CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_carts_branch_updated_at_idx
  ON public.saved_carts (branch_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS saved_carts_user_updated_at_idx
  ON public.saved_carts (user_id, updated_at DESC);

-- -----------------------------
-- 3) Inventory variants and losses
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  barcode text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_unique_name_idx
  ON public.product_variants (product_id, name);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx
  ON public.product_variants (product_id);

CREATE TABLE IF NOT EXISTS public.inventory_variant_stock (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_variant_stock_unique_idx
  ON public.inventory_variant_stock (variant_id, branch_id);

CREATE TABLE IF NOT EXISTS public.inventory_losses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  product_id uuid REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT inventory_losses_item_check CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL) OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS inventory_losses_branch_created_at_idx
  ON public.inventory_losses (branch_id, created_at DESC);

-- -----------------------------
-- 4) Customers
-- -----------------------------
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

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text;

CREATE INDEX IF NOT EXISTS customers_branch_full_name_idx
  ON public.customers (branch_id, full_name);

CREATE INDEX IF NOT EXISTS customers_contact_number_idx
  ON public.customers (contact_number);

CREATE INDEX IF NOT EXISTS customers_email_idx
  ON public.customers (email);

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

-- -----------------------------
-- 5) Expenses
-- -----------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'expense_category'
  ) THEN
    CREATE TYPE expense_category AS ENUM (
      'Utilities',
      'Supplier',
      'Rent',
      'Salaries',
      'Marketing',
      'Maintenance',
      'Spoilage/Loss',
      'Miscellaneous'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  category expense_category NOT NULL DEFAULT 'Miscellaneous',
  description text NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method varchar(50) NOT NULL DEFAULT 'Cash',
  reference_no varchar(100),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_expenses_date
  ON public.expenses (expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_category
  ON public.expenses (category);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read expenses" ON public.expenses;
CREATE POLICY "Allow authenticated users to read expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert expenses" ON public.expenses;
CREATE POLICY "Allow authenticated users to insert expenses"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Allow individual management of expenses" ON public.expenses;
CREATE POLICY "Allow individual management of expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_expenses_modtime ON public.expenses;
CREATE TRIGGER update_expenses_modtime
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE PROCEDURE public.update_modified_column();

-- -----------------------------
-- 6) Customer credits
-- -----------------------------
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

-- -----------------------------
-- 7) Sales, payments, stock movement RLS
-- -----------------------------
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS stock_movements_select_policy ON public.stock_movements;
CREATE POLICY stock_movements_select_policy
ON public.stock_movements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR p.branch_id = stock_movements.branch_id
      )
  )
);

DROP POLICY IF EXISTS stock_movements_insert_policy ON public.stock_movements;
CREATE POLICY stock_movements_insert_policy
ON public.stock_movements
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
        OR p.branch_id = stock_movements.branch_id
      )
  )
);

-- -----------------------------
-- 8) User activity logs
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  branch_id uuid REFERENCES public.branches(id),
  activity_type text NOT NULL CHECK (activity_type IN ('login', 'logout')),
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_activity_logs_user_created_at_idx
  ON public.user_activity_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_activity_logs_branch_created_at_idx
  ON public.user_activity_logs (branch_id, created_at DESC);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_activity_logs_select_policy ON public.user_activity_logs;
CREATE POLICY user_activity_logs_select_policy
ON public.user_activity_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR p.id = user_activity_logs.user_id
      )
  )
);

DROP POLICY IF EXISTS user_activity_logs_insert_policy ON public.user_activity_logs;
CREATE POLICY user_activity_logs_insert_policy
ON public.user_activity_logs
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
        OR p.branch_id = user_activity_logs.branch_id
        OR user_activity_logs.branch_id IS NULL
      )
  )
);

COMMIT;
