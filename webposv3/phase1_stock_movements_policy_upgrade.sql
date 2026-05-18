BEGIN;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

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

COMMIT;
