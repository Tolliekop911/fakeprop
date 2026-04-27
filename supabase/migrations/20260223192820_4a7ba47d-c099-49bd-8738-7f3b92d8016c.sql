
-- Update user_roles RLS: only root can manage roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Root can manage roles" ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'root'::app_role))
  WITH CHECK (has_role(auth.uid(), 'root'::app_role));

-- Update admin_page_permissions RLS: only root can manage
DROP POLICY IF EXISTS "Admins can manage page permissions" ON public.admin_page_permissions;
CREATE POLICY "Root can manage page permissions" ON public.admin_page_permissions FOR ALL
  USING (has_role(auth.uid(), 'root'::app_role))
  WITH CHECK (has_role(auth.uid(), 'root'::app_role));
