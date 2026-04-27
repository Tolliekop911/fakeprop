import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Wallet, FileText, Plus } from "lucide-react";

interface FundedAccount {
  id: string;
  challenge_number: string;
  account_size: number;
  current_balance: number;
  current_profit_percent: number;
  current_profit_amount: number;
  status: string;
  phase: string;
  program_type: string;
  external_account_id: string | null;
  personal_account_id: string | null;
  created_at: string;
}

const PropFunded = () => {
  const navigate = useNavigate();
  const [fundedAccounts, setFundedAccounts] = useState<FundedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFundedAccounts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/prop/login");
        return;
      }

      // Fetch challenges that are in funded phase
      const { data, error } = await supabase
        .from("challenges")
        .select("id, challenge_number, account_size, current_balance, current_profit_percent, current_profit_amount, status, phase, program_type, external_account_id, personal_account_id, created_at")
        .eq("user_id", user.id)
        .eq("phase", "funded")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setFundedAccounts(data);
      }
      setLoading(false);
    };

    fetchFundedAccounts();
  }, [navigate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <PropDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Funded Accounts</h1>
            <p className="text-muted-foreground">
              Your funded trading accounts after passing the evaluation
            </p>
          </div>
          <Button
            onClick={() => navigate("/prop/choose-challenge")}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Purchase New Funded Account
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-secondary/50 border-border/20">
                <CardContent className="p-6">
                  <div className="h-32 rounded bg-muted/40 animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : fundedAccounts.length === 0 ? (
          <Card className="bg-secondary/50 border-border/20">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Funded Accounts Yet</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Complete your challenge phases to get funded. Once you pass all evaluation stages, 
                your funded account will appear here with withdrawal access enabled.
              </p>
              <Button 
                onClick={() => navigate("/prop/challenges")}
                className="bg-primary hover:bg-primary/90"
              >
                View Your Challenges
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fundedAccounts.map((account) => (
              <Card 
                key={account.id} 
                className="bg-secondary/50 border-border/20 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/prop/account/${account.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      FD-{account.challenge_number.replace("CH-", "")}
                    </CardTitle>
                    <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-500 font-medium">
                      Funded
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Size</p>
                      <p className="text-lg font-semibold">{formatCurrency(account.account_size)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current Balance</p>
                      <p className="text-lg font-semibold text-green-500">{formatCurrency(account.current_balance)}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/prop/withdraw");
                      }}
                    >
                      <Wallet className="w-4 h-4 mr-1" />
                      Withdraw
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/prop/certificates");
                      }}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Certificate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PropDashboardLayout>
  );
};

export default PropFunded;
