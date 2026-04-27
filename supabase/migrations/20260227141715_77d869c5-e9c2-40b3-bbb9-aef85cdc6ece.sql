CREATE POLICY "Users can view profiles referred by their code"
ON public.profiles FOR SELECT
USING (
  referred_by IN (
    SELECT affiliate_code FROM profiles WHERE user_id = auth.uid()
  )
);