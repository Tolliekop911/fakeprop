-- Drop the policy we just created - it's still too permissive
DROP POLICY IF EXISTS "Anonymous users can view their own conversation only" ON public.conversations;

-- Anonymous users don't need direct SELECT access to the conversations table
-- The edge function uses service role key which bypasses RLS
-- This completely removes anonymous access to prevent email harvesting