-- Add policy for anonymous users to view their conversations by email
CREATE POLICY "Anonymous users can view their conversations by email"
ON public.conversations
FOR SELECT
USING (
  is_anonymous = true 
  AND user_email IS NOT NULL
);