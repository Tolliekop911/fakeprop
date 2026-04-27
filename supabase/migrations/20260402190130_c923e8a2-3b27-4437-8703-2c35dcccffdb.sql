
CREATE TABLE public.demo_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_size NUMERIC NOT NULL,
  api_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own demo accounts"
ON public.demo_accounts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert demo accounts"
ON public.demo_accounts FOR INSERT
WITH CHECK (true);
