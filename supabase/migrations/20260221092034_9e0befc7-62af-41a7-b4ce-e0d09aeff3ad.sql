
CREATE TABLE public.affiliate_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state_region TEXT NULL,
  country TEXT NOT NULL,
  zip_code TEXT NULL,
  company TEXT NULL,
  website TEXT NULL,
  promotion_plan TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT NULL,
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit affiliate applications"
  ON public.affiliate_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own applications"
  ON public.affiliate_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all affiliate applications"
  ON public.affiliate_applications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_affiliate_applications_updated_at
  BEFORE UPDATE ON public.affiliate_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
