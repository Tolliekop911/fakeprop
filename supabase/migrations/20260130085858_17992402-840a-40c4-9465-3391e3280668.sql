-- Add additional profile fields for storing user details
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Create table for storing trader strategy PDFs (required for funded accounts)
CREATE TABLE public.trader_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trader_strategies ENABLE ROW LEVEL SECURITY;

-- Users can view their own strategies
CREATE POLICY "Users can view their own strategies" 
ON public.trader_strategies 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own strategies
CREATE POLICY "Users can insert their own strategies" 
ON public.trader_strategies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all strategies
CREATE POLICY "Admins can view all strategies" 
ON public.trader_strategies 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role IN ('admin', 'moderator')
));

-- Admins can update strategies
CREATE POLICY "Admins can update strategies" 
ON public.trader_strategies 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role IN ('admin', 'moderator')
));

-- Create coupon codes table
CREATE TABLE public.coupon_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can validate coupon codes (for checkout)
CREATE POLICY "Anyone can validate coupon codes" 
ON public.coupon_codes 
FOR SELECT 
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Admins can manage coupon codes
CREATE POLICY "Admins can manage coupon codes" 
ON public.coupon_codes 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role IN ('admin', 'moderator')
));

-- Create table to track coupon usage
CREATE TABLE public.coupon_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupon_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  discount_amount NUMERIC(10, 2)
);

-- Enable RLS
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- Users can see their own coupon usage
CREATE POLICY "Users can see their own coupon usage" 
ON public.coupon_usage 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own coupon usage
CREATE POLICY "Users can insert their own coupon usage" 
ON public.coupon_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all coupon usage
CREATE POLICY "Admins can view all coupon usage" 
ON public.coupon_usage 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role IN ('admin', 'moderator')
));

-- Create storage bucket for strategy PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('strategies', 'strategies', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for strategies bucket
CREATE POLICY "Users can upload their own strategies" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'strategies' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own strategies" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'strategies' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all strategies" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'strategies' AND EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role IN ('admin', 'moderator')
));