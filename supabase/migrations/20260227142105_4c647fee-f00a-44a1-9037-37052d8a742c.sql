
-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view profiles referred by their code" ON public.profiles;

-- Create a security definer function to get user's affiliate code
CREATE OR REPLACE FUNCTION public.get_user_affiliate_code(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT affiliate_code FROM profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Recreate policy using the function
CREATE POLICY "Users can view profiles referred by their code"
ON public.profiles FOR SELECT
USING (
  referred_by IS NOT NULL AND referred_by = public.get_user_affiliate_code(auth.uid())
);
