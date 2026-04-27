-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc-documents', 'kyc-documents', false);

-- RLS policies for KYC documents bucket
-- Users can upload their own KYC documents
CREATE POLICY "Users can upload kyc documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own KYC documents
CREATE POLICY "Users can view own kyc documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all KYC documents
CREATE POLICY "Admins can view all kyc documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);