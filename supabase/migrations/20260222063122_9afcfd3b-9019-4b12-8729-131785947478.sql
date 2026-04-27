
-- Challenge progression mapping table
-- Maps every program_type + account_size + phase combination to a condor group
CREATE TABLE public.challenge_progression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_type varchar NOT NULL,
  account_size numeric NOT NULL,
  phase varchar NOT NULL,
  condor_group_mapping varchar DEFAULT NULL,
  next_phase varchar DEFAULT NULL,
  next_account_size numeric DEFAULT NULL,
  profit_target_percent numeric DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_type, account_size, phase)
);

ALTER TABLE public.challenge_progression ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage challenge progression"
ON public.challenge_progression FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view challenge progression"
ON public.challenge_progression FOR SELECT
USING (true);

CREATE TRIGGER update_challenge_progression_updated_at
BEFORE UPDATE ON public.challenge_progression
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
