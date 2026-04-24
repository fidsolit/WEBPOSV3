-- Phase 1 schema upgrade for existing POS database
-- Safe, non-destructive migration (ALTER/CREATE IF NOT EXISTS).
-- Review in staging first before running in production.

BEGIN;

-- Optional helper for UUID default generation.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------
-- 1) Products hardening
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

-- Barcode uniqueness can fail on legacy data with duplicates.
-- Create a regular lookup index first, then promote to UNIQUE only when safe.
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

-- -----------------------------
-- 2) Inventory consistency + logs
-- -----------------------------
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

-- -----------------------------
-- 3) Sales + receipts + order history + voiding
-- -----------------------------
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

-- -----------------------------
-- 4) Sale items enhancements (discount/custom item support)
-- -----------------------------
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

-- -----------------------------
-- 5) Payments enhancements
-- -----------------------------
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

-- -----------------------------
-- 6) Saved cart support
-- -----------------------------
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

COMMIT;

