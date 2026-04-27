-- Allow root/moderator/admin to provision accounts and challenges from /roots approvals
DROP POLICY IF EXISTS "Admins can manage all accounts" ON public.accounts;
CREATE POLICY "Admins root moderator can manage all accounts"
ON public.accounts
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

DROP POLICY IF EXISTS "Admins can view all accounts" ON public.accounts;
CREATE POLICY "Admins root moderator can view all accounts"
ON public.accounts
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'root'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can manage all challenges" ON public.challenges;
CREATE POLICY "Admins root moderator can manage all challenges"
ON public.challenges
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

DROP POLICY IF EXISTS "Admins can view all challenges" ON public.challenges;
CREATE POLICY "Admins root moderator can view all challenges"
ON public.challenges
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'root'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);