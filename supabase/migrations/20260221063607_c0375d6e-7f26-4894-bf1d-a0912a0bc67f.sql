
-- Add first_name and last_name to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plain_p text;

-- Add ExternalAccountID and PersonalAccountID to challenges
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS external_account_id text;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS personal_account_id text;
