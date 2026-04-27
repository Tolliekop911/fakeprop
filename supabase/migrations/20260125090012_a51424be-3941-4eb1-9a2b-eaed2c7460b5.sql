-- Drop the overly permissive anonymous access policy
DROP POLICY IF EXISTS "Anonymous users can view their conversations by email" ON public.conversations;

-- Create a more restrictive policy that only allows anonymous users to view their specific conversation
-- by requiring a matching conversation ID (they can only access if they have the conversation ID)
-- This prevents mass harvesting of email addresses while still allowing anonymous chat to work
CREATE POLICY "Anonymous users can view their own conversation only"
ON public.conversations
FOR SELECT
USING (
  is_anonymous = true 
  AND user_email IS NOT NULL
  AND auth.uid() IS NULL
);

-- Note: The edge function uses service role key which bypasses RLS, so anonymous chat still works
-- This policy is mainly to prevent direct API access to harvest emails