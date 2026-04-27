DROP POLICY IF EXISTS "Admins can manage coupon codes" ON public.coupon_codes;

CREATE POLICY "Admins can manage coupon codes"
ON public.coupon_codes
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR public.has_role(auth.uid(), 'root'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR public.has_role(auth.uid(), 'root'::app_role)
);