-- Fix security: Add explicit deny policies for unauthenticated access to profiles and admin_logs

-- Profiles: add policy to deny access when not authenticated
CREATE POLICY "Deny unauthenticated access to profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admin logs: add policy to deny access when not authenticated  
CREATE POLICY "Deny unauthenticated access to admin_logs"
ON public.admin_logs
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create a view for payouts that hides sensitive payment_details
CREATE VIEW public.user_payouts_view
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  account_id,
  amount,
  payment_method,
  requested_at,
  processed_at,
  status
FROM public.payouts;

-- Create login_history table to track actual logins
CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address text,
  user_agent text,
  device_type text,
  browser text,
  os text,
  status text NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on login_history
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own login history
CREATE POLICY "Users can view their own login history"
ON public.login_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own login records
CREATE POLICY "Users can insert their own login history"
ON public.login_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all login history
CREATE POLICY "Admins can view all login history"
ON public.login_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));