-- Allow root/moderator/admin to view and manage all payment orders
DROP POLICY IF EXISTS "Admins can view all payment orders" ON public.payment_orders;
CREATE POLICY "Admins and root can view all payment orders"
ON public.payment_orders
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'root'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can manage all payment orders" ON public.payment_orders;
CREATE POLICY "Admins and root can manage all payment orders"
ON public.payment_orders
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'root'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'root'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);