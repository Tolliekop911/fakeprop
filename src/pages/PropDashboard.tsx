import { useState, useEffect } from "react";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Trophy, TrendingUp, Target, CheckCircle, Clock, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Challenge {
  id: string;
  challenge_number: string;
  phase: string;
  status: string;
  account_size: number;
  current_balance: number;
  profit_target_percent: number;
  current_profit_percent: number;
  current_drawdown_percent: number;
  max_drawdown_percent: number;
  days_traded: number;
  min_trading_days: number;
}

interface Trade {
  id: string;
  symbol: string;
  direction: string;
  lot_size: number;
  pnl: number | null;
  opened_at: string;
}

const PropDashboard = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user's challenges
        const { data: challengeData, error: challengeError } = await supabase
          .from("challenges")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (challengeError) throw challengeError;
        setChallenges(challengeData || []);

        // Fetch recent trades
        const { data: tradeData, error: tradeError } = await supabase
          .from("trades")
          .select("*")
          .eq("user_id", user.id)
          .order("opened_at", { ascending: false })
          .limit(5);

        if (tradeError) throw tradeError;
        setRecentTrades(tradeData || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stats from real data
  const activeChallenges = challenges.filter(c => c.status === "active" || c.status === "in_progress").length;
  const fundedChallenges = challenges.filter(c => c.phase === "funded");
  const totalFundedCapital = fundedChallenges.reduce((sum, c) => sum + c.account_size, 0);
  const totalProfit = challenges.reduce((sum, c) => sum + (c.current_balance - c.account_size), 0);
  const totalDaysTraded = challenges.reduce((sum, c) => sum + c.days_traded, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  const formatPhase = (phase: string) => {
    if (phase === "phase1") return "Phase 1";
    if (phase === "phase2") return "Phase 2";
    if (phase === "funded") return "Funded";
    return phase;
  };

  const formatStatus = (status: string) => {
    if (status === "active") return "Active";
    if (status === "in_progress") return "In Progress";
    if (status === "passed") return "Passed";
    if (status === "failed") return "Failed";
    return status;
  };

  if (loading) {
    return (
      <PropDashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PropDashboardLayout>
    );
  }

  return (
    <PropDashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 text-primary" />
              {activeChallenges > 0 && (
                <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">Active</span>
              )}
            </div>
            <p className="text-2xl font-bold">{activeChallenges}</p>
            <p className="text-sm text-muted-foreground">Active Challenges</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-primary" />
              {fundedChallenges.length > 0 && <CheckCircle className="w-4 h-4 text-green-500" />}
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalFundedCapital)}</p>
            <p className="text-sm text-muted-foreground">Total Funded Capital</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
              {totalProfit >= 0 ? "+" : ""}{formatCurrency(totalProfit)}
            </p>
            <p className="text-sm text-muted-foreground">Total Profit</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <p className="text-2xl font-bold">{totalDaysTraded}</p>
            <p className="text-sm text-muted-foreground">Days Traded</p>
          </div>
        </div>

        {/* Challenge Cards */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-heading font-bold">My Challenges</h3>
            <Link to="/prop/choose-challenge">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                + Start New Challenge
              </Button>
            </Link>
          </div>

          {challenges.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h4 className="text-lg font-semibold mb-2">No Challenges Yet</h4>
              <p className="text-muted-foreground mb-6">
                Start your trading journey by purchasing a challenge. Prove your skills and get funded!
              </p>
              <Link to="/prop/choose-challenge">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  + Start New Challenge
                </Button>
              </Link>
            </div>
          ) : (
            challenges.map((challenge) => (
              <div key={challenge.id} className="bg-card border border-border rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground">{challenge.challenge_number}</span>
                      <span className={`text-xs px-2 py-1 rounded ${challenge.phase === 'funded' ? 'bg-green-500/10 text-green-500' : challenge.phase === 'phase2' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {formatPhase(challenge.phase)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${challenge.status === 'active' || challenge.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                        {formatStatus(challenge.status)}
                      </span>
                    </div>
                    <p className="text-2xl font-bold mt-2">{formatCurrency(challenge.account_size)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className={`text-xl font-bold ${challenge.current_balance >= challenge.account_size ? "text-green-500" : "text-red-500"}`}>
                      {formatCurrency(challenge.current_balance)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Profit Target</p>
                    <p className="font-semibold">{challenge.profit_target_percent}%</p>
                    <p className="text-sm text-green-500">{(challenge.current_profit_percent ?? 0).toFixed(2)}% current</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Daily Drawdown</p>
                    <p className="font-semibold">{(challenge.current_drawdown_percent ?? 0).toFixed(2)}%</p>
                    <p className="text-sm text-muted-foreground">{challenge.max_drawdown_percent}% max</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Trading Days</p>
                    <p className="font-semibold">{challenge.days_traded}</p>
                    {challenge.min_trading_days > 0 && <p className="text-sm text-muted-foreground">{challenge.min_trading_days} min required</p>}
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-center">
                    <Link to={`/prop/account/${challenge.id}`}>
                      <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">View Details</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Trades */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-heading font-bold mb-6">Recent Trades</h3>
          {recentTrades.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No trades yet</p>
              <p className="text-sm text-muted-foreground">Your trading history will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Pair</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Volume</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Profit/Loss</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-4 px-4 font-semibold">{trade.symbol}</td>
                      <td className="py-4 px-4">
                        <span className={`text-xs px-2 py-1 rounded ${trade.direction === 'buy' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {trade.direction?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-4">{trade.lot_size}</td>
                      <td className={`py-4 px-4 font-semibold ${(trade.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {(trade.pnl || 0) >= 0 ? "+" : ""}{formatCurrency(trade.pnl || 0)}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">{new Date(trade.opened_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PropDashboardLayout>
  );
};

export default PropDashboard;
