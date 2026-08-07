-- Make phone nullable (email/password users don't have a phone)
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;

-- Drop the blanket UNIQUE constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;

-- Add a partial unique index: phone must be unique only when non-null
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_not_null
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;
