
-- Create payment_orders table to track all payment submissions
CREATE TABLE public.payment_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_reference VARCHAR NOT NULL DEFAULT ('ORD-' || substr(gen_random_uuid()::text, 1, 8)),
  program_type VARCHAR NOT NULL,
  account_size NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method VARCHAR NOT NULL CHECK (payment_method IN ('wire_transfer', 'wct')),
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  -- Wire transfer fields
  full_name TEXT,
  email TEXT,
  bank_account_used TEXT,
  proof_of_payment_url TEXT,
  -- WCT fields
  wct_payment_id TEXT,
  wct_payment_url TEXT,
  -- Coupon
  coupon_code TEXT,
  discount_percent NUMERIC DEFAULT 0,
  original_amount NUMERIC,
  -- Metadata
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view their own payment orders"
ON public.payment_orders FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create their own payment orders"
ON public.payment_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all orders
CREATE POLICY "Admins can manage all payment orders"
ON public.payment_orders FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all orders
CREATE POLICY "Admins can view all payment orders"
ON public.payment_orders FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- Users can upload their own payment proofs
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own payment proofs
CREATE POLICY "Users can view their own payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all payment proofs
CREATE POLICY "Admins can view all payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_payment_orders_updated_at
BEFORE UPDATE ON public.payment_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
