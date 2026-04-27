import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  BarChart3,
  History,
  Shield,
  Wallet,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Trophy,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import StrategyUpload from "@/components/prop/StrategyUpload";

interface Challenge {
  id: string;
  challenge_number: string;
  phase: string;
  status: string;
  account_size: number;
  current_balance: number;
  profit_target_percent: number;
  profit_target_amount: number;
  current_profit_percent: number;
  current_profit_amount: number;
  current_drawdown_percent: number;
  max_drawdown_percent: number;
  daily_drawdown_percent: number;
  days_traded: number;
  min_trading_days: number;
  program_type: string;
  start_date: string;
  account_id: string;
}

interface Trade {
  id: string;
  symbol: string;
  direction: string;
  lot_size: number;
  pnl: number | null;
  opened_at: string;
  rule_violation: boolean | null;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
}

const PropAccountDetail = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/prop/login");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/prop/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!accountId || !user) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        // Try fetching challenge by ID first, then by account_id
        let chData = null;
        const { data: byId, error: byIdErr } = await supabase
          .from("challenges")
          .select("*")
          .eq("id", accountId)
          .maybeSingle();

        if (byId) {
          chData = byId;
        } else {
          // Fallback: try matching by account_id
          const { data: byAccId } = await supabase
            .from("challenges")
            .select("*")
            .eq("account_id", accountId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          chData = byAccId;
        }

        if (!chData) {
          if (mounted) {
            setChallenge(null);
            setLoading(false);
          }
          return;
        }

        if (mounted) setChallenge(chData as Challenge);

        // Fetch trades for this challenge
        const { data: trData } = await supabase
          .from("trades")
          .select("id, symbol, direction, lot_size, pnl, opened_at, rule_violation")
          .eq("challenge_id", chData.id)
          .order("opened_at", { ascending: false })
          .limit(50);
        if (mounted) setTrades((trData ?? []) as Trade[]);

        // Fetch payouts for user account
        if (chData.account_id) {
          const { data: pyData } = await supabase
            .from("payouts")
            .select("id, amount, status, requested_at")
            .eq("account_id", chData.account_id)
            .order("requested_at", { ascending: false })
            .limit(20);
          if (mounted) setPayouts((pyData ?? []) as Payout[]);
        }
      } catch (err) {
        console.error("Error loading account detail:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [accountId, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out", description: "See you next time!" });
    navigate("/prop/login");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/prop/dashboard" },
    { icon: Trophy, label: "My Challenges", path: "/prop/challenges" },
    { icon: TrendingUp, label: "Trading Stats", path: "/prop/dashboard" },
    { icon: History, label: "Trade History", path: "/prop/dashboard" },
    { icon: Settings, label: "Settings", path: "/prop/profile" },
  ];

  const formatCurrency = (v: number | null | undefined) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v ?? 0);

  const formatPhase = (p: string | undefined) => {
    if (!p) return "-";
    const lp = p.toLowerCase();
    if (lp === "phase1" || lp === "phase 1") return "Phase 1";
    if (lp === "phase2" || lp === "phase 2") return "Phase 2";
    if (lp === "funded") return "Funded";
    return p;
  };

  const formatStatus = (s: string | undefined) => {
    if (!s) return "-";
    const ls = s.toLowerCase();
    if (ls === "active") return "In Progress";
    if (ls === "passed" || ls === "funded") return "Passed";
    if (ls === "failed" || ls === "breached") return "Failed";
    return s;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl text-muted-foreground">Account not found</p>
          <Link to="/prop/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const startingBalance = challenge.account_size;
  const profitProgress = challenge.profit_target_percent > 0 ? (challenge.current_profit_percent / challenge.profit_target_percent) * 100 : 0;
  const drawdownProgress = challenge.max_drawdown_percent > 0 ? (challenge.current_drawdown_percent / challenge.max_drawdown_percent) * 100 : 0;
  const dailyDrawdownProgress = challenge.daily_drawdown_percent > 0 ? (challenge.current_drawdown_percent / challenge.daily_drawdown_percent) * 100 : 0;

  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => (t.pnl ?? 0) > 0).length;
  const losingTrades = trades.filter((t) => (t.pnl ?? 0) < 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : "0";
  const avgWin = winningTrades > 0 ? (trades.filter((t) => (t.pnl ?? 0) > 0).reduce((s, t) => s + (t.pnl ?? 0), 0) / winningTrades).toFixed(2) : "0";
  const avgLoss = losingTrades > 0 ? (trades.filter((t) => (t.pnl ?? 0) < 0).reduce((s, t) => s + Math.abs(t.pnl ?? 0), 0) / losingTrades).toFixed(2) : "0";

  const rules = [
    { name: "Profit Target", value: `${challenge.profit_target_percent}% (${formatCurrency(challenge.profit_target_amount)})`, passed: challenge.current_profit_percent >= challenge.profit_target_percent, current: `${challenge.current_profit_percent}%` },
    { name: "Max Drawdown", value: `${challenge.max_drawdown_percent}% (${formatCurrency(challenge.account_size * (challenge.max_drawdown_percent / 100))})`, passed: challenge.current_drawdown_percent < challenge.max_drawdown_percent, current: `${challenge.current_drawdown_percent}%` },
    { name: "Daily Drawdown", value: `${challenge.daily_drawdown_percent}% (${formatCurrency(challenge.account_size * (challenge.daily_drawdown_percent / 100))})`, passed: challenge.current_drawdown_percent < challenge.daily_drawdown_percent, current: `${challenge.current_drawdown_percent}%` },
    { name: "Min Trading Days", value: `${challenge.min_trading_days} days`, passed: challenge.days_traded >= challenge.min_trading_days, current: `${challenge.days_traded} days` },
  ];

  const canRequestPayout = challenge.phase?.toLowerCase() === "funded" && challenge.current_profit_percent > 0;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} bg-secondary/50 border-r border-border/20 transition-all duration-300 flex flex-col`}>
        <div className="p-6 border-b border-border/20">
          <Link to="/prop" className="flex items-center gap-2">
            {sidebarOpen ? (
              <span className="text-xl font-heading font-bold">
                <span className="text-foreground">KUBERA</span> <span className="text-primary">MARKETS</span>
              </span>
            ) : (
              <span className="text-xl font-heading font-bold text-primary">KM</span>
            )}
          </Link>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li key={index}>
                <Link to={item.path} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                  <item.icon className="w-5 h-5" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-border/20">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-secondary/30 border-b border-border/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-lg">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/prop/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {user?.email}</span>
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary font-semibold">{user?.email?.charAt(0)?.toUpperCase()}</span>
            </div>
          </div>
        </header>

        {/* Account Header */}
        <div className="p-6 border-b border-border/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-sm text-muted-foreground">{challenge.challenge_number}</span>
                <span className={`text-xs px-2 py-1 rounded ${challenge.phase?.toLowerCase() === "funded" ? "bg-green-500/10 text-green-500" : challenge.phase?.toLowerCase() === "phase2" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}>{formatPhase(challenge.phase)}</span>
                <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">{formatStatus(challenge.status)}</span>
              </div>
              <h1 className="text-3xl font-heading font-bold">{formatCurrency(challenge.account_size)} Account</h1>
              <p className="text-muted-foreground">Program: {challenge.program_type?.toUpperCase?.() ?? "-"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(challenge.current_balance)}</p>
              <p className="text-sm text-primary">+{formatCurrency(challenge.current_balance - startingBalance)} ({challenge.current_profit_percent}%)</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="trades">Trade History</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
              {challenge.phase?.toLowerCase() === "funded" && (
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
              )}
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><DollarSign className="w-5 h-5 text-primary" /><span className="text-sm text-muted-foreground">Account Balance</span></div>
                  <p className="text-2xl font-bold">{formatCurrency(challenge.current_balance)}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-primary" /><span className="text-sm text-muted-foreground">Current Profit</span></div>
                  <p className="text-2xl font-bold text-primary">+{challenge.current_profit_percent}%</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-5 h-5 text-destructive" /><span className="text-sm text-muted-foreground">Drawdown</span></div>
                  <p className="text-2xl font-bold text-destructive">{challenge.current_drawdown_percent}%</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><Calendar className="w-5 h-5 text-primary" /><span className="text-sm text-muted-foreground">Days Traded</span></div>
                  <p className="text-2xl font-bold">{challenge.days_traded}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium">Profit Target</span><span className="text-sm text-muted-foreground">{challenge.current_profit_percent}% / {challenge.profit_target_percent}%</span></div>
                  <Progress value={Math.min(profitProgress, 100)} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-2">{formatCurrency(challenge.current_profit_amount)} / {formatCurrency(challenge.profit_target_amount)}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium">Max Drawdown</span><span className="text-sm text-muted-foreground">{challenge.current_drawdown_percent}% / {challenge.max_drawdown_percent}%</span></div>
                  <Progress value={drawdownProgress} className="h-3 [&>div]:bg-destructive" />
                  <p className="text-xs text-muted-foreground mt-2">{formatCurrency(challenge.account_size * (challenge.current_drawdown_percent / 100))} / {formatCurrency(challenge.account_size * (challenge.max_drawdown_percent / 100))} limit</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium">Daily Drawdown</span><span className="text-sm text-muted-foreground">{challenge.current_drawdown_percent}% / {challenge.daily_drawdown_percent}%</span></div>
                  <Progress value={dailyDrawdownProgress} className="h-3 [&>div]:bg-warning" />
                  <p className="text-xs text-muted-foreground mt-2">{formatCurrency(challenge.account_size * (challenge.current_drawdown_percent / 100))} / {formatCurrency(challenge.account_size * (challenge.daily_drawdown_percent / 100))} limit</p>
                </div>
              </div>

            </TabsContent>

            {/* Strategy Tab - Only for funded accounts */}
            {challenge.phase?.toLowerCase() === "funded" && (
              <TabsContent value="strategy" className="space-y-6">
                {user && <StrategyUpload accountId={challenge.account_id} userId={user.id} />}
              </TabsContent>
            )}

            {/* Performance */}
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><BarChart3 className="w-5 h-5 text-primary" /><span className="text-sm text-muted-foreground">Win Rate</span></div><p className="text-2xl font-bold">{winRate}%</p></div>
                <div className="bg-card border border-border rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-primary" /><span className="text-sm text-muted-foreground">Avg Win</span></div><p className="text-2xl font-bold text-primary">${avgWin}</p></div>
                <div className="bg-card border border-border rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><TrendingDown className="w-5 h-5 text-destructive" /><span className="text-sm text-muted-foreground">Avg Loss</span></div><p className="text-2xl font-bold text-destructive">${avgLoss}</p></div>
                <div className="bg-card border border-border rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><History className="w-5 h-5 text-primary" /><span className="text-sm text-muted-foreground">Total Trades</span></div><p className="text-2xl font-bold">{totalTrades}</p></div>
              </div>
            </TabsContent>

            {/* Trade History */}
            <TabsContent value="trades">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-heading font-bold mb-6">Trade History</h3>
                {trades.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No trades recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Symbol</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Direction</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Lot Size</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">P&L</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Violation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((trade) => (
                          <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="py-4 px-4 text-muted-foreground">{new Date(trade.opened_at).toLocaleDateString()}</td>
                            <td className="py-4 px-4 font-semibold">{trade.symbol}</td>
                            <td className="py-4 px-4"><span className={`text-xs px-2 py-1 rounded ${trade.direction?.toUpperCase() === "BUY" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{trade.direction}</span></td>
                            <td className="py-4 px-4">{trade.lot_size}</td>
                            <td className={`py-4 px-4 font-semibold ${(trade.pnl ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>{(trade.pnl ?? 0) >= 0 ? "+" : ""}${Number(trade.pnl ?? 0).toFixed(2)}</td>
                            <td className="py-4 px-4">{trade.rule_violation ? <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="w-4 h-4" /> Yes</span> : <span className="flex items-center gap-1 text-primary"><CheckCircle className="w-4 h-4" /> No</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Rules */}
            <TabsContent value="rules">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-heading font-bold mb-6">Trading Rules</h3>
                <div className="space-y-4">
                  {rules.map((rule, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-4">{rule.passed ? <CheckCircle className="w-6 h-6 text-primary" /> : <XCircle className="w-6 h-6 text-destructive" />}<div><p className="font-semibold">{rule.name}</p><p className="text-sm text-muted-foreground">Limit: {rule.value}</p></div></div>
                      <div className="text-right"><p className={`font-semibold ${rule.passed ? "text-primary" : "text-destructive"}`}>{rule.current}</p><p className="text-sm text-muted-foreground">{rule.passed ? "Compliant" : "Violation"}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Payouts */}
            <TabsContent value="payouts" className="space-y-6">
              {canRequestPayout && (
                <div className="bg-card border-2 border-primary/30 rounded-xl p-6">
                  <div className="flex items-center justify-between"><div><h3 className="text-lg font-heading font-bold">Request Payout</h3><p className="text-muted-foreground">You are eligible to request a payout</p></div><Button className="bg-primary hover:bg-primary/90 text-primary-foreground"><Wallet className="w-4 h-4 mr-2" /> Request Payout</Button></div>
                </div>
              )}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-heading font-bold mb-6">Payout History</h3>
                {payouts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No payout history yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-border"><th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th><th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Amount</th><th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th></tr></thead>
                      <tbody>
                        {payouts.map((payout) => (
                          <tr key={payout.id} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="py-4 px-4 text-muted-foreground">{new Date(payout.requested_at).toLocaleDateString()}</td>
                            <td className="py-4 px-4 font-semibold text-primary">{formatCurrency(payout.amount)}</td>
                            <td className="py-4 px-4"><span className={`text-xs px-2 py-1 rounded ${payout.status === "paid" ? "bg-primary/10 text-primary" : payout.status === "pending" ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive"}`}>{payout.status.charAt(0)?.toUpperCase() + payout.status.slice(1)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default PropAccountDetail;
