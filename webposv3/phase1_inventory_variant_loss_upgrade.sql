-- Inventory variant + loss tracking upgrade
-- Run after phase1_schema_upgrade.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

COMMIT;

