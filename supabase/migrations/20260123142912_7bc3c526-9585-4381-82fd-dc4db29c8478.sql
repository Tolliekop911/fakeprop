-- Create KYC submissions table
CREATE TABLE public.kyc_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  user_name TEXT,
  document_type TEXT NOT NULL, -- passport, id_card, drivers_license
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  address_proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, under_review, approved, rejected
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own KYC submissions
CREATE POLICY "Users can view their own kyc submissions"
  ON public.kyc_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own KYC submissions
CREATE POLICY "Users can insert their own kyc submissions"
  ON public.kyc_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all KYC submissions
CREATE POLICY "Admins can view all kyc submissions"
  ON public.kyc_submissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all KYC submissions
CREATE POLICY "Admins can manage all kyc submissions"
  ON public.kyc_submissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_kyc_submissions_updated_at
  BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();