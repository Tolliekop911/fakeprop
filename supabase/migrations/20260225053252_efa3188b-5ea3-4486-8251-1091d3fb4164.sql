-- Add affiliate_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliate_code text;
