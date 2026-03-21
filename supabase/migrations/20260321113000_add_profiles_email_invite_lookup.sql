-- Add email to profiles to support admin invite-by-email flow
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email for existing users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.user_id
  AND (p.email IS NULL OR p.email = '');

-- Enable joins from family_roles -> profiles by adding a FK to profiles.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'family_roles_user_id_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.family_roles
      ADD CONSTRAINT family_roles_user_id_profiles_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles (user_id)
      ON DELETE CASCADE;
  END IF;
END;
$$;

-- Enforce case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_ci ON public.profiles (lower(email));

-- Update signup trigger to store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Admin-only lookup by email for invites
CREATE OR REPLACE FUNCTION public.find_profile_by_email(_family_id UUID, _email TEXT)
RETURNS TABLE (user_id UUID, display_name TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE public.is_family_admin(auth.uid(), _family_id)
    AND p.email IS NOT NULL
    AND lower(p.email) = lower(_email)
  LIMIT 1;
$$;
