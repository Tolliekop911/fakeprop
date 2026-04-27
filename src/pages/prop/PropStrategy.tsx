import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import StrategyUpload from "@/components/prop/StrategyUpload";
import { FileText, AlertTriangle } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface FundedAccount {
  id: string;
  account_id: string;
  challenge_number: string;
  account_size: number;
  phase: string;
}

const PropStrategy = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [fundedAccounts, setFundedAccounts] = useState<FundedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/prop/login");
        return;
      }
      setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/prop/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("challenges")
        .select("id, account_id, challenge_number, account_size, phase")
        .eq("user_id", user.id)
        .eq("phase", "funded")
        .order("created_at", { ascending: false });
      setFundedAccounts((data ?? []) as FundedAccount[]);
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <PropDashboardLayout title="Trading Strategy">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-heading font-bold">Trading Strategy Documents</h2>
            <p className="text-muted-foreground">
              Submit your trading strategy for each funded account
            </p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        ) : fundedAccounts.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-heading font-bold text-lg mb-1">No Funded Accounts</h3>
            <p className="text-muted-foreground">
              You need a funded account before you can submit a trading strategy.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {fundedAccounts.map((account) => (
              <div key={account.id}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {account.challenge_number} — ${Number(account.account_size).toLocaleString()} Funded Account
                </h3>
                <StrategyUpload accountId={account.account_id} userId={user!.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </PropDashboardLayout>
  );
};

export default PropStrategy;
