-- Create app_role enum for role-based access
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create accounts table for trading accounts
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_number VARCHAR(20) NOT NULL UNIQUE,
    account_type VARCHAR(20) NOT NULL DEFAULT 'prop', -- 'prop' or 'broker'
    account_size DECIMAL(15,2) NOT NULL DEFAULT 0,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    equity DECIMAL(15,2) NOT NULL DEFAULT 0,
    leverage VARCHAR(10) DEFAULT '1:30',
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, closed
    phase VARCHAR(20) DEFAULT 'evaluation', -- evaluation, verification, funded
    program_type VARCHAR(20) DEFAULT '1-step', -- 1-step, 2-step, halfway
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on accounts
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for accounts
CREATE POLICY "Users can view their own accounts"
ON public.accounts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
ON public.accounts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all accounts"
ON public.accounts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all accounts"
ON public.accounts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create challenges table
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    challenge_number VARCHAR(20) NOT NULL UNIQUE,
    program_type VARCHAR(20) NOT NULL DEFAULT '1-step',
    account_size DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL,
    profit_target_percent DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    profit_target_amount DECIMAL(15,2) NOT NULL,
    current_profit_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    current_profit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    max_drawdown_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    max_drawdown_amount DECIMAL(15,2) NOT NULL,
    current_drawdown_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    daily_drawdown_percent DECIMAL(5,2) NOT NULL DEFAULT 4.00,
    days_traded INTEGER NOT NULL DEFAULT 0,
    min_trading_days INTEGER NOT NULL DEFAULT 2,
    phase VARCHAR(20) NOT NULL DEFAULT 'phase1', -- phase1, phase2, funded
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, passed, failed, funded
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- RLS policies for challenges
CREATE POLICY "Users can view their own challenges"
ON public.challenges
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges"
ON public.challenges
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all challenges"
ON public.challenges
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all challenges"
ON public.challenges
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create trades table
CREATE TABLE public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
    symbol VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- buy, sell
    lot_size DECIMAL(10,2) NOT NULL,
    entry_price DECIMAL(20,5) NOT NULL,
    exit_price DECIMAL(20,5),
    stop_loss DECIMAL(20,5),
    take_profit DECIMAL(20,5),
    pnl DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, closed
    rule_violation BOOLEAN DEFAULT FALSE,
    violation_type VARCHAR(50),
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- RLS policies for trades
CREATE POLICY "Users can view their own trades"
ON public.trades
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
ON public.trades
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all trades"
ON public.trades
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all trades"
ON public.trades
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create payouts table
CREATE TABLE public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, paid
    payment_method VARCHAR(50),
    payment_details JSONB,
    admin_notes TEXT,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for payouts
CREATE POLICY "Users can view their own payouts"
ON public.payouts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can request payouts"
ON public.payouts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payouts"
ON public.payouts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all payouts"
ON public.payouts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create rules table for trading rules configuration
CREATE TABLE public.rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_type VARCHAR(20) NOT NULL,
    account_size DECIMAL(15,2) NOT NULL,
    profit_target_phase1 DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    profit_target_phase2 DECIMAL(5,2) DEFAULT 5.00,
    max_drawdown DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    daily_drawdown DECIMAL(5,2) NOT NULL DEFAULT 4.00,
    min_trading_days INTEGER NOT NULL DEFAULT 2,
    time_limit_days INTEGER DEFAULT 30,
    leverage VARCHAR(10) DEFAULT '1:30',
    profit_split DECIMAL(5,2) DEFAULT 80.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(program_type, account_size)
);

-- Enable RLS on rules
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for rules (public read, admin write)
CREATE POLICY "Anyone can view rules"
ON public.rules
FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Admins can manage rules"
ON public.rules
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin_logs table for audit trail
CREATE TABLE public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- user, account, challenge, payout, trade, rule
    target_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_logs
CREATE POLICY "Admins can view admin logs"
ON public.admin_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert admin logs"
ON public.admin_logs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create tickets table for support
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS policies for tickets
CREATE POLICY "Users can view their own tickets"
ON public.tickets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
ON public.tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
ON public.tickets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
ON public.tickets
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all tickets"
ON public.tickets
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at on all tables
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at
BEFORE UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at
BEFORE UPDATE ON public.payouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rules_updated_at
BEFORE UPDATE ON public.rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default rules for all program types and account sizes
INSERT INTO public.rules (program_type, account_size, profit_target_phase1, profit_target_phase2, max_drawdown, daily_drawdown, min_trading_days, time_limit_days, leverage, profit_split)
VALUES 
  ('1-step', 5000, 8.00, NULL, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('1-step', 10000, 8.00, NULL, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('1-step', 25000, 8.00, NULL, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('1-step', 50000, 8.00, NULL, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('1-step', 100000, 8.00, NULL, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('1-step', 200000, 8.00, NULL, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('2-step', 5000, 8.00, 5.00, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('2-step', 10000, 8.00, 5.00, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('2-step', 25000, 8.00, 5.00, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('2-step', 50000, 8.00, 5.00, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('2-step', 100000, 8.00, 5.00, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('2-step', 200000, 8.00, 5.00, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('halfway', 5000, 6.00, NULL, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('halfway', 10000, 6.00, NULL, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('halfway', 25000, 6.00, NULL, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('halfway', 50000, 6.00, NULL, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('halfway', 100000, 6.00, NULL, 10.00, 4.00, 2, 30, '1:30', 80.00),
  ('halfway', 200000, 6.00, NULL, 10.00, 4.00, 2, 30, '1:30', 80.00);