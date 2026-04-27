import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const PropChallenges = () => {
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<
    Array<{
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
      days_traded: number;
      min_trading_days: number;
      program_type: string;
      end_date: string | null;
      updated_at: string;
      created_at: string;
    }>
  >([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) return;

        const { data, error } = await supabase
          .from("challenges")
          .select(
            "id, challenge_number, phase, status, account_size, current_balance, profit_target_percent, profit_target_amount, current_profit_percent, current_profit_amount, current_drawdown_percent, max_drawdown_percent, days_traded, min_trading_days, program_type, end_date, updated_at, created_at"
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!mounted) return;

        setChallenges((data ?? []) as any);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const { activeChallenges, pastChallenges, stats } = useMemo(() => {
    const normalizeStatus = (s: string) => s?.toLowerCase?.() ?? "";
    const isActive = (s: string) => normalizeStatus(s) === "active";
    const isPassed = (s: string) => ["passed", "funded"].includes(normalizeStatus(s));
    const isFailed = (s: string) => ["failed", "breached"].includes(normalizeStatus(s));
    const isExpired = (s: string) => ["expired", "disabled"].includes(normalizeStatus(s));

    const active = challenges.filter((c) => isActive(c.status));
    const past = challenges.filter((c) => !isActive(c.status));
    const passed = challenges.filter((c) => isPassed(c.status)).length;
    const failed = challenges.filter((c) => isFailed(c.status)).length;
    const expired = challenges.filter((c) => isExpired(c.status)).length;
    const totalCompleted = passed + failed + expired;
    const successRate = totalCompleted > 0 ? Math.round((passed / totalCompleted) * 100) : 0;

    return {
      activeChallenges: active,
      pastChallenges: past,
      stats: {
        activeCount: active.length,
        passed,
        failed,
        expired,
        successRate,
      },
    };
  }, [challenges]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
      amount || 0
    );

  const formatProgramType = (programType: string) => {
    const p = (programType || "").toLowerCase();
    if (p === "1-step" || p === "1 step") return "1 Step";
    if (p === "2-step" || p === "2 step") return "2 Step";
    if (p.includes("half")) return "Halfway There";
    return programType || "-";
  };

  const formatPhase = (phase: string) => {
    const p = (phase || "").toLowerCase();
    if (p === "phase1" || p === "phase 1") return "Phase 1";
    if (p === "phase2" || p === "phase 2") return "Phase 2";
    if (p === "funded") return "Funded";
    return phase || "-";
  };

  const formatResult = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "active") return "Active";
    if (s === "passed" || s === "funded") return "Passed";
    if (s === "failed" || s === "breached") return "Failed";
    if (s === "expired") return "Expired";
    if (s === "disabled") return "Disabled";
    return status || "-";
  };

  const getReasonText = (challenge: { status: string; phase: string; current_drawdown_percent: number; max_drawdown_percent: number; end_date: string | null }) => {
    const s = (challenge.status || "").toLowerCase();
    if (s === "passed" || s === "funded") {
      return "Profit target reached";
    }
    if (s === "failed" || s === "breached") {
      if (challenge.current_drawdown_percent >= challenge.max_drawdown_percent) {
        return "Max drawdown breached";
      }
      return "Rule violation";
    }
    if (s === "expired") return "Time limit exceeded";
    if (s === "disabled") return "Disabled by admin";
    return "-";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
      case "In Progress":
        return "bg-blue-500/10 text-blue-500";
      case "Passed":
        return "bg-green-500/10 text-green-500";
      case "Failed":
        return "bg-destructive/10 text-destructive";
      case "Expired":
      case "Disabled":
        return "bg-amber-500/10 text-amber-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPhaseColor = (phase: string) => {
    if (phase === "Phase 1") return "bg-blue-500/10 text-blue-500";
    if (phase === "Phase 2") return "bg-amber-500/10 text-amber-500";
    if (phase === "Funded") return "bg-green-500/10 text-green-500";
    return "bg-muted text-muted-foreground";
  };

  return (
    <PropDashboardLayout title="Challenges">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeCount}</p>
                  <p className="text-sm text-muted-foreground">Active Challenges</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.passed}</p>
                  <p className="text-sm text-muted-foreground">Passed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.expired}</p>
                  <p className="text-sm text-muted-foreground">Expired / Disabled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.successRate}%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Challenges */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Active Challenges
            </CardTitle>
          <Link to="/prop/choose-challenge">
              <Button className="bg-primary hover:bg-primary/90">
                + Start New Challenge
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Loading challenges…</div>
            ) : activeChallenges.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">No active challenges yet.</div>
            ) : (
              activeChallenges.map((challenge) => {
                const phaseLabel = formatPhase(challenge.phase);
                const statusLabel = formatResult(challenge.status);
                const profitTargetLabel = `${challenge.profit_target_percent}%`;
                const currentProfitLabel = `${challenge.current_profit_percent}%`;
                const drawdownLabel = `${challenge.current_drawdown_percent}%`;
                const maxDrawdownLabel = `${challenge.max_drawdown_percent}%`;
                const progress =
                  challenge.profit_target_percent > 0
                    ? Math.min(100, (challenge.current_profit_percent / challenge.profit_target_percent) * 100)
                    : 0;

                return (
                  <div key={challenge.id} className="p-4 bg-muted/30 rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-muted-foreground">{challenge.challenge_number}</span>
                      <span className={`text-xs px-2 py-1 rounded ${getPhaseColor(phaseLabel)}`}>
                        {phaseLabel}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(statusLabel)}`}>
                        {statusLabel}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                        {formatProgramType(challenge.program_type)}
                      </span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(challenge.account_size)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(challenge.current_balance)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Profit Target</p>
                    <p className="font-semibold">{profitTargetLabel}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(challenge.profit_target_amount)}</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Current Profit</p>
                    <p className="font-semibold text-primary">{currentProfitLabel}</p>
                    <p className="text-xs text-primary">{formatCurrency(challenge.current_profit_amount)}</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Drawdown</p>
                    <p className="font-semibold">{drawdownLabel}</p>
                    <p className="text-xs text-muted-foreground">Max: {maxDrawdownLabel}</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Days Traded</p>
                    <p className="font-semibold">{challenge.days_traded}</p>
                    {challenge.min_trading_days > 0 && (
                      <p className="text-xs text-muted-foreground">Min: {challenge.min_trading_days}</p>
                    )}
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 flex items-center justify-center">
                    <Link to={`/prop/account/${challenge.id}`}>
                      <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>

                {phaseLabel !== "Funded" && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress to Target</span>
                      <span>
                        {currentProfitLabel} / {profitTargetLabel}
                      </span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Past Challenges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Past Challenges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Challenge ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Account Size</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Phase</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Result</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-6 px-4 text-muted-foreground" colSpan={6}>
                        Loading…
                      </td>
                    </tr>
                  ) : pastChallenges.length === 0 ? (
                    <tr>
                      <td className="py-6 px-4 text-muted-foreground" colSpan={6}>
                        No past challenges.
                      </td>
                    </tr>
                  ) : (
                    pastChallenges.map((challenge) => {
                      const phaseLabel = formatPhase(challenge.phase);
                      const resultLabel = formatResult(challenge.status);
                      const date = challenge.end_date ?? challenge.updated_at ?? challenge.created_at;

                      return (
                        <tr key={challenge.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-4 px-4 font-mono text-sm">{challenge.challenge_number}</td>
                          <td className="py-4 px-4">{formatCurrency(challenge.account_size)}</td>
                          <td className="py-4 px-4">{phaseLabel}</td>
                          <td className="py-4 px-4">
                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(resultLabel)}`}>
                              {resultLabel}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-muted-foreground">{new Date(date).toLocaleDateString()}</td>
                          <td className="py-4 px-4 text-muted-foreground">{getReasonText(challenge)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PropDashboardLayout>
  );
};

export default PropChallenges;
