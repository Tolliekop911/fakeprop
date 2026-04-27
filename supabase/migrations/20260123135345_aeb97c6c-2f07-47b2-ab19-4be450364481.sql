-- Create conversations table for chat sessions
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  status VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'resolved', 'closed')),
  escalated_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  assigned_admin_id UUID,
  user_name VARCHAR,
  user_email VARCHAR,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR NOT NULL CHECK (sender_type IN ('user', 'ai', 'admin')),
  sender_id UUID,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR is_anonymous = true);

CREATE POLICY "Users can update their own conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations" 
ON public.conversations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all conversations" 
ON public.conversations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Chat messages policies
CREATE POLICY "Users can view messages in their conversations" 
ON public.chat_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.conversations 
  WHERE conversations.id = chat_messages.conversation_id 
  AND conversations.user_id = auth.uid()
));

CREATE POLICY "Users can insert messages in their conversations" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conversations 
  WHERE conversations.id = chat_messages.conversation_id 
  AND (conversations.user_id = auth.uid() OR conversations.is_anonymous = true)
));

CREATE POLICY "Admins can view all messages" 
ON public.chat_messages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all messages" 
ON public.chat_messages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;