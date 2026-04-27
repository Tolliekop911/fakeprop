
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage coupon codes" ON public.coupon_codes;
DROP POLICY IF EXISTS "Anyone can validate coupon codes" ON public.coupon_codes;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can manage coupon codes"
  ON public.coupon_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role])
    )
  );

CREATE POLICY "Anyone can validate coupon codes"
  ON public.coupon_codes
  FOR SELECT
  USING (
    is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until > now())
  );
