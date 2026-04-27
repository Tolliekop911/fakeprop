-- Create chat_bans table for temporary banning users from chat
CREATE TABLE public.chat_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email VARCHAR NOT NULL,
  banned_by UUID NULL,
  ban_reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_bans ENABLE ROW LEVEL SECURITY;

-- Admins can view all bans
CREATE POLICY "Admins can view all chat bans" 
ON public.chat_bans 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all bans
CREATE POLICY "Admins can manage chat bans" 
ON public.chat_bans 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for efficient lookups
CREATE INDEX idx_chat_bans_user_email ON public.chat_bans(user_email);
CREATE INDEX idx_chat_bans_expires_at ON public.chat_bans(expires_at);