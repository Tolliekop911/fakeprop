-- Add policy for anonymous users to view messages in their conversations (by email)
CREATE POLICY "Anonymous users can view messages in their conversations by email"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = chat_messages.conversation_id 
    AND conversations.is_anonymous = true
    AND conversations.user_email IS NOT NULL
  )
);