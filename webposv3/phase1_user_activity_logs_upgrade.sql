BEGIN;

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
