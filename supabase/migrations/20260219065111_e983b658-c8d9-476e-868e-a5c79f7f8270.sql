
-- Table to store granular page-level access permissions for admin/moderator users
CREATE TABLE public.admin_page_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, page_key)
);

ALTER TABLE public.admin_page_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions
CREATE POLICY "Admins can manage page permissions"
ON public.admin_page_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can read their own permissions (so sidebar can filter correctly)
CREATE POLICY "Users can view their own page permissions"
ON public.admin_page_permissions
FOR SELECT
USING (auth.uid() = user_id);
