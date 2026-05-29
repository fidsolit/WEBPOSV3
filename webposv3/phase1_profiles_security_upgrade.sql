BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
  )
);

DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
  )
);

COMMIT;
