
-- Add moderator role for the 2 finance/compliance-only admins
INSERT INTO public.user_roles (user_id, role) VALUES 
  ('0eaa75e4-015b-417d-977a-c76cbe91c7e4', 'moderator'),
  ('d2cbc472-2956-44ac-8c32-238b343d594a', 'moderator')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create FAQ table for admin-managed FAQ content
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  sub_category TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Public can read active FAQs
CREATE POLICY "Anyone can read active FAQs"
ON public.faqs FOR SELECT
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage FAQs"
ON public.faqs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_faqs_updated_at
BEFORE UPDATE ON public.faqs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with existing FAQ data - General: Account/Security
INSERT INTO public.faqs (category, sub_category, question, answer, sort_order) VALUES
('general', 'account-security', 'How do I create a live Condor trading account?', 'To create a trading account, register through our client portal, and complete the KYC process. After the KYC process is completed, you will have the ability to create your wallet and live Condor trading account within the client portal.', 1),
('general', 'account-security', 'How do I verify my account (KYC)?', 'To verify your account, upload a government-issued photo ID and a recent proof of address (dated within the last 90 days) through your client portal. Verification typically takes less than 24 hours.', 2),
('general', 'account-security', 'Can I open multiple trading accounts under one profile?', 'Yes, you can open multiple live accounts under a single client profile. This allows you to test different strategies or manage multiple portfolios with ease.', 3),
('general', 'account-security', 'What is a phone password and why do I need it?', 'A phone password functions similarly to a PIN. It is required for transferring funds to and from your wallet, as well as submitting withdrawal requests. This added layer of security is unique to you and helps protect your account from unauthorized access. Please safeguard your phone password just as you would the PIN for your bank card. If you forget your phone password, please contact our Help Desk to request a reset.', 4),
('general', 'account-security', 'How can I reset my Condor password?', 'You can reset your trading password through your client portal. If you''re unable to log in, contact our support team for assistance.', 5),
('general', 'account-security', 'Are my funds safe with your brokerage?', 'Client funds are held in segregated accounts with top-tier banks. We follow strict regulatory guidelines to ensure the security and protection of client capital.', 6),

-- General: Platform/Trading
('general', 'platform-trading', 'How do I download and install the Condor platform?', 'You can download Condor for desktop or android directly from our website. Installation is quick and easy across all devices.', 1),
('general', 'platform-trading', 'What trading instruments are available on Condor?', 'We offer forex, commodities, indices and cryptocurrencies.', 2),
('general', 'platform-trading', 'Are there any fees or commissions?', 'We do not charge any commissions on trades. All trading costs are included in the spread, which varies depending on the instrument and market conditions.', 3),
('general', 'platform-trading', 'Can I use Expert Advisors (EAs) or automated trading on Condor?', 'Not at the present time.', 4),
('general', 'platform-trading', 'What leverage do you offer on Condor accounts?', 'We offer leverage up to 1:100. You can select your account leverage in your client portal.', 5),
('general', 'platform-trading', 'What is the margin call and stop-out level?', 'Our margin call level is 150% and the stop-out level is 75%. If your free margin falls below the stop-out level, open positions may be automatically closed.', 6),
('general', 'platform-trading', 'Can I hedge positions on Condor?', 'Yes, Condor supports hedging, allowing you to open opposite positions in the same instrument simultaneously.', 7),
('general', 'platform-trading', 'What time zone is the Condor server set to?', 'Our Condor server operates in GMT+2, which aligns with most global trading sessions.', 8),
('general', 'platform-trading', 'What order types are available on Condor?', 'Condor supports market orders, pending orders (buy/sell limit and stop), stop loss, take profit, and trailing stop functionalities.', 9),
('general', 'platform-trading', 'Can I trade using my mobile device?', 'Yes, Condor is available for Android devices, giving you full access to charts, order management, and account monitoring on the go.', 10),
('general', 'platform-trading', 'What are swap rates and how do they affect my trades?', 'Swap rates are rollover fees charged for holding positions overnight. You can view daily swap rates directly in the Condor platform by right-clicking an instrument and selecting "Specifications."', 11),
('general', 'platform-trading', 'How can I view my trade history and account statement?', 'In Condor, navigate to the "History" tab in the Terminal window. For official account statements, you can also request reports from your client portal.', 12),
('general', 'platform-trading', 'What should I do if my trades are not executing?', 'If your trades are not executing, please check the following: Ensure you have sufficient margin in your account. Confirm that the market is open for the instrument you''re trying to trade. Check for any trade restrictions or trading hours in the instrument''s specifications. If the issue persists, contact our support team with your Condor account number and the specific order details.', 13),
('general', 'platform-trading', 'What is slippage and why does it happen?', 'Slippage occurs when a trade is executed at a different price than requested due to rapid market movements or low liquidity. It''s a normal part of trading in volatile conditions and can result in either a better or worse execution price.', 14),
('general', 'platform-trading', 'What is the difference between a standard and a raw spread account?', 'A standard account includes the broker''s fee in the spread, while a raw spread account offers tighter spreads with a small commission per trade. At Kubera Markets, we offer only spread-based accounts with no commissions.', 15),

-- General: Account Management
('general', 'account-management', 'What are the minimum deposit requirements?', 'The minimum deposit amount for a live CFD trading account is $100.00 USD.', 1),
('general', 'account-management', 'How can I fund my trading account?', 'You can deposit funds through several methods, including bank transfer, credit/debit cards, cryptocurrency and supported e-wallets. Log in to your client portal and click the "Deposit to the Wallet" button available in the Wallet page.', 2),
('general', 'account-management', 'How do I withdraw funds from my account?', 'Withdrawals can be requested via the client portal. Processing times may vary depending on your chosen withdrawal option.', 3),
('general', 'account-management', 'Who do I contact for technical support?', 'Our support team is available 24/5 via live chat, email, or discord. For urgent platform issues, please include your Condor account number when contacting us.', 4),
('general', 'account-management', 'Are there any inactivity or maintenance fees?', 'We do not charge any fees for inactive accounts. However, we recommend regular account activity to ensure full access to platform features and avoid automatic account archiving.', 5),

-- Challenge / Funded FAQs
('challenge', NULL, 'What is the process to become a funded prop trader?', 'You must first pass the Apprentice and Trainee account by reaching the 8% profit target before receiving access to our funded Intern account.', 1),
('challenge', NULL, 'Who can get funded?', 'We offer funding to individuals who are 18 years of age or older.', 2),
('challenge', NULL, 'Which countries are traders accepted?', 'We accept traders from all countries except Malaysia, United States of America, Zimbabwe, Iran, Iraq, North Korea, Somalia, Vietnam, Burundi, the Central African Republic, Ivory Coast, Liberia, Libya, Sudan, Cuba, Syria, Afghanistan, Yemen, Palestine, Myanmar, Nicaragua, the Republic of the Congo, Crimea, the Democratic Republic of the Congo, Eritrea, Guinea, Guinea-Bissau, Papua New Guinea, South Sudan, Vanuatu, Venezuela, Algeria, Russia, Kenya, and Ghana.', 3),
('challenge', NULL, 'How long does it take to get funded?', 'After successfully passing the Trainee account, you will receive an email automatically with your Intern account. Jr. Associate and higher accounts are created manually and take up to 3 business days.', 4),
('challenge', NULL, 'Does Kubera Markets fund traders with Real or Virtual/Simulated Funds?', 'We only fund traders with real capital, aligning the financial interests of both Kubera Markets and our traders.', 5),
('challenge', NULL, 'Is your program completely free?', 'We''re actively seeking skilled, profitable traders to trade with our capital and we want to give everyone a fair opportunity to prove themselves without any upfront costs. If you breach any account and want to try again, you must pay a $25 fee to receive a new Apprentice account.', 6),
('challenge', NULL, 'What are the trading rules?', 'Our program rules are very simple, you must reach the defined 8% profit target without hitting the 4% static drawdown limit.', 7),
('challenge', NULL, 'How does the static drawdown work?', 'The maximum static drawdown, fixed at 4%, refers to the maximum amount your account''s value can decrease before a breach occurs. For example, with a $1,000 starting balance and a 4% maximum static drawdown, your account would breach if your equity dropped by $40 to $960.', 8),
('challenge', NULL, 'How does the profit target work?', 'The profit target, fixed at 8%, refers to the amount you need to reach in order to pass your account. Once you''ve reached your profit target, you must manually close your open positions. For example, with a $1,000 starting balance and a 8% profit target, your account would pass once your realized profit is at least $80 which the ending is above $1,080.', 9),
('challenge', NULL, 'What happens during an account breach?', 'If your account reaches the 4% static drawdown limit, it will be considered a breach. This will result in revoking your trading access. If this happens, you have the opportunity to try again for free.', 10),
('challenge', NULL, 'What is the process for the scaling program?', 'The Intern level is the lowest level funded account. In order to scale to the next funding level you must reach the 8% profit target. Upon reaching your profit target, your open positions are automatically closed and trading is disabled. In your dashboard, you can request an upgrade to the higher funding level. After selecting upgrade, you will receive an email with your new login credentials with the account funded with the higher balance.', 11),
('challenge', NULL, 'How often can I receive a payout on my funded account?', 'You can request a payout once you''ve reached the 8% profit target. The payout is capped at 8% of your starting account balance and you can only receive one payout per funding level.', 12),
('challenge', NULL, 'What payment methods are available for payouts?', 'You can receive your payout in Crypto or Bank Wire.', 13),
('challenge', NULL, 'What is the payout process?', 'To be eligible for a payout, traders must have at least passed the Intern account or higher, approved KYC, and signed the prop trading agreement. To withdraw your profits, go to the funded account section on the dashboard and click the Transfer to Wallet button next to your passed funded account to transfer the profit from your funded account to your Kubera wallet. From your Kubera wallet, you can request a withdrawal by crypto or bank wire. Internal processing of wallet withdraws takes up to 3 business days. The daily cut off time for withdrawal processing is 17:00 Malaysian time.', 14),
('challenge', NULL, 'What trading platforms are available?', 'The trading platform currently offered is Condor Pro platform which is integrated with Tradingview charts.', 15),
('challenge', NULL, 'What are the available trading hours?', 'Please refer to each instrument on the trading platform for trading hours. Trading hours are displayed in the Coordinated Universal Time (UTC).', 16),
('challenge', NULL, 'What asset classes can I trade?', 'Traders can trade CFDs on the following asset classes: FX, Stock Indices, Precious Metals, and Cryptocurrencies.', 17),
('challenge', NULL, 'What is the leverage available?', 'Please refer to each instrument on the trading platform for the available leverage. Below is the leverage offered on each asset class: FX: 100:1, Stock Indices: 50:1, Precious Metals: 100:1, Cryptocurrencies: 2:1.', 18),
('challenge', NULL, 'How many lots can I trade?', 'The number of lots you can trade is limited by the available margin in your Condor Pro account and leverage of the financial instrument you trade.', 19),
('challenge', NULL, 'Can I hold positions overnight and the weekend?', 'While it is possible for traders to keep positions open overnight and on weekends, this is not advised. Traders should exercise caution during market opening and closing times due to illiquidity, price gaps, and high volatility.', 20),
('challenge', NULL, 'Are there any trading strategies or EAs not permitted?', 'All trading strategies are accepted except tick scalping, which is not allowed on any account type.', 21),
('challenge', NULL, 'Can I trade during news releases?', 'During the evaluation phases, you can trade freely during all news releases. After you pass the evaluation and are a Qualified Trader, you should be careful when trading during news releases. On Kubera Pro 8%/10% accounts, you are NOT permitted to execute any new trades or close existing trades on the targeted instruments within the window of 2 minutes before and 2 minutes after the release of the news announcements. On Kubera Pro 6%, Kubera One and Kubera Three accounts, this restriction applies to a window of 5 minutes before and 5 minutes after the news releases. If your Stop Gain or Take Profit is triggered/filled during the restricted time window, it will be considered a violation classified as a Soft Breach, and any profits acquired will not be eligible for a Performance Fee.', 22),
('challenge', NULL, 'Is there a lot size limit during the evaluation?', 'There are no maximum lot size limits during the evaluations.', 23),
('challenge', NULL, 'What is the lot size limit on qualified (funded) trader accounts?', 'On Qualified Trader accounts, the max lot exposure (total combined allowed lots/position size) applies to each account size. Kubera Pro / Kubera One / Kubera Three limits: $5k = Max 2.5 lots, $10k = Max 5 lots, $25k = Max 10 lots, $50k = Max 20 lots, $100k = Max 40 lots, $200k = Max 80 lots. Kubera Swing limits: $5k = Max 1.25 lots, $10k = Max 2.5 lots, $25k = Max 5 lots, $50k = Max 10 lots, $100k = Max 20 lots, $200k = Max 40 lots.', 24),
('challenge', NULL, 'What is the 40% Best Day Rule?', 'The 40% Best Day Rule states that no single trading day should contribute more than 40% of the total generated profits. The consistency score is calculated by dividing the net profits generated on your best day by the total net profits on the account. If the result is 0.40 (or 40%) or more, the trader is not complying with the consistency rule.', 25),
('challenge', NULL, 'How does the Performance Fee On-Demand work?', 'On Kubera Pro/Swing/One/Three accounts, traders can request a payout whenever they desire, provided they fulfil the following requirements: 1) Adhere to the 40% Best Day Rule, and 2) Have a minimum of 2% of gross profits on the account balance.', 26),
('challenge', NULL, 'Is there an inactivity fee?', 'There is no inactivity fee, but your evaluation account will automatically breach 90 days from once it''s issued. There is no time limit or inactivity fee for funded accounts.', 27),
('challenge', NULL, 'Is Kubera Markets regulated?', 'Since 2021, Kubera Capital Markets Ltd has been regulated and authorized by the Labuan Financial Services Authority (LFSA) as a licensed money broker. License Number (MB/21/0086).', 28),
('challenge', NULL, 'Can I have a CFD trading and Prop trading account at the same time?', 'Yes, you can open a CFD trading account with us and join our Prop Trading program.', 29),
('challenge', NULL, 'Do you provide Challenge and Payout Certificates?', 'We only provide Payout Certificates, which are emailed to you once the payout is processed.', 30),
('challenge', NULL, 'Can I have more than one prop trading account?', 'No, you can only have only one prop trading account at a time. If we discover multiple registered email addresses under the same name, you will be banned from the program and all payouts are denied.', 31);
