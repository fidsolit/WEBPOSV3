-- FIRST: Check the profiles table structure to see what columns exist
-- Run this query to see columns:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name='profiles';

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.on_auth_user_created();

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'cashier')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log the error for debugging
  RAISE WARNING 'Error in on_auth_user_created: %', SQLERROR_MESSAGE;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.on_auth_user_created();

-- Disable RLS temporarily to debug
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
