-- Ensure root/admin can always view role assignments and rights in admin settings

-- Root should be able to view all profiles (admin identities)
CREATE POLICY "Root can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'root'));

-- Make role visibility explicit for root/admin (read-only)
CREATE POLICY "Root and Admin can view all roles"
ON public.user_roles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'root')
  OR public.has_role(auth.uid(), 'admin')
);

-- Admins must be able to view page rights for all admins/users (but not edit)
CREATE POLICY "Root and Admin can view all page permissions"
ON public.admin_page_permissions
FOR SELECT
USING (
  public.has_role(auth.uid(), 'root')
  OR public.has_role(auth.uid(), 'admin')
);