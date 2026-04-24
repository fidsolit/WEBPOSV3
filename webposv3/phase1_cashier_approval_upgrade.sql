-- Cashier approval workflow
-- Run after existing role/profile setup migrations

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;

-- Existing admins stay approved.
UPDATE public.profiles
SET is_approved = true
WHERE role = 'admin';

-- Keep current cashiers approved to avoid locking active staff.
UPDATE public.profiles
SET is_approved = true
WHERE role = 'cashier'
  AND is_approved IS DISTINCT FROM true;

-- Future signups: cashier starts unapproved; admin starts approved.
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
  resolved_name text;
  resolved_role text;
BEGIN
  resolved_name := COALESCE(new.raw_user_meta_data->>'full_name', new.email);
  resolved_role := COALESCE(new.raw_user_meta_data->>'role', 'cashier');

  INSERT INTO public.profiles (id, full_name, role, is_approved)
  VALUES (
    new.id,
    resolved_name,
    resolved_role,
    CASE WHEN resolved_role = 'admin' THEN true ELSE false END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE INDEX IF NOT EXISTS profiles_role_is_approved_idx
  ON public.profiles (role, is_approved);

COMMIT;
