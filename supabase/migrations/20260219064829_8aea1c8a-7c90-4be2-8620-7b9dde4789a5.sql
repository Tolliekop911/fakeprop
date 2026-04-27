
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_reply TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  replied_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (no auth required for contact form)
CREATE POLICY "Anyone can insert contact submissions"
ON public.contact_submissions
FOR INSERT
WITH CHECK (true);

-- Only admins can view and manage submissions
CREATE POLICY "Admins can manage contact submissions"
ON public.contact_submissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_contact_submissions_updated_at
BEFORE UPDATE ON public.contact_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
