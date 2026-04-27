import { useState, useEffect } from "react";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Wallet, Loader2, CheckCircle, Clock, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FundedAccount {
  id: string;
  account_number: string;
  balance: number;
  equity: number;
  account_size: number;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  payment_method: string | null;
}

const PropWithdraw = () => {
  const [accounts, setAccounts] = useState<FundedAccount[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch funded challenges (active or disabled pending strategy review)
      const { data: challengeData } = await supabase
        .from("challenges")
        .select("account_id, current_balance, account_size, status")
        .eq("user_id", user.id)
        .eq("phase", "funded")
        .in("status", ["active", "funded", "disabled"]);

      if (challengeData && challengeData.length > 0) {
        const accountIds = challengeData.map((c) => c.account_id);
        const challengeMap = challengeData.reduce((acc: Record<string, number>, c) => {
          acc[c.account_id] = c.account_size;
          return acc;
        }, {});

        const { data: accountData } = await supabase
          .from("accounts")
          .select("id, account_number, balance, equity")
          .in("id", accountIds);

        setAccounts(
          (accountData || []).map((a) => ({
            ...a,
            account_size: challengeMap[a.id] || 0,
          }))
        );
      }

      // Fetch previous payouts
      const { data: payoutData } = await supabase
        .from("payouts")
        .select("*")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(10);

      setPayouts(payoutData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !amount || !paymentMethod || !paymentDetails.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields including payment details (wallet address, bank info, etc.)",
      });
      return;
    }

    const withdrawAmount = parseFloat(amount);
    const account = accounts.find((a) => a.id === selectedAccount);
    if (!account) {
      toast({ variant: "destructive", title: "Error", description: "Account not found" });
      return;
    }

    const profit = account.balance - account.account_size;
    const minRequiredProfit = account.account_size * 0.05; // 2% profit + 3% buffer = 5%
    const bufferAmount = account.account_size * 0.03;
    const withdrawableProfit = profit - bufferAmount; // Profit minus 3% buffer stays in account
    const maxWithdrawable = Math.max(0, withdrawableProfit * 0.8);

    if (profit < minRequiredProfit) {
      toast({
        variant: "destructive",
        title: "Insufficient Profit",
        description: `You need at least 5% profit ($${minRequiredProfit.toFixed(2)}) before withdrawing (2% minimum + 3% buffer). Current profit: $${profit.toFixed(2)}`,
      });
      return;
    }

    if (withdrawAmount <= 0 || withdrawAmount > maxWithdrawable) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: `Maximum withdrawable amount is $${maxWithdrawable.toFixed(2)} (80% of $${withdrawableProfit.toFixed(2)} profit after 3% buffer)`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fullAmount = withdrawAmount / 0.8; // Full amount including our 20% cut
      const { error } = await supabase.from("payouts").insert({
        user_id: user.id,
        account_id: selectedAccount,
        amount: withdrawAmount,
        full_amount: fullAmount,
        payment_method: paymentMethod,
        payment_details: { details: paymentDetails },
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted for review",
      });

      setAmount("");
      setPaymentDetails("");
      setSelectedAccount("");
      setPaymentMethod("");
      fetchData();
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit withdrawal request",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 text-xs rounded bg-yellow-500/10 text-yellow-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
      case "approved":
        return <span className="px-2 py-1 text-xs rounded bg-blue-500/10 text-blue-500">Approved</span>;
      case "paid":
        return <span className="px-2 py-1 text-xs rounded bg-green-500/10 text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Paid</span>;
      case "rejected":
        return <span className="px-2 py-1 text-xs rounded bg-destructive/10 text-destructive">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded bg-muted">{status}</span>;
    }
  };

  if (loading) {
    return (
      <PropDashboardLayout title="Request Withdrawal">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PropDashboardLayout>
    );
  }

  const totalPaid = payouts.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = payouts.filter(p => p.status === "pending").length;
  const approvedCount = payouts.filter(p => p.status === "approved").length;

  return (
    <PropDashboardLayout title="Request Withdrawal">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold" style={{color: 'hsl(var(--primary))'}}>
                    {approvedCount}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Withdrawal Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Request Withdrawal
            </CardTitle>
            <CardDescription>
              Request a payout from your funded account. Withdrawals are processed within 2-3 business days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No funded accounts available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete your challenge to unlock withdrawals
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Account</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a funded account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_number} - Balance: {formatCurrency(account.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                   </Select>
                  {selectedAccount && (() => {
                    const acct = accounts.find(a => a.id === selectedAccount);
                    if (!acct) return null;
                    const profit = acct.balance - acct.account_size;
                    const bufferAmount = acct.account_size * 0.03;
                    const withdrawableProfit = profit - bufferAmount;
                    const maxWithdraw = Math.max(0, withdrawableProfit * 0.8);
                    const minRequired = acct.account_size * 0.05;
                    const isEligible = profit >= minRequired;
                    return (
                      <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        <p>Account Size: {formatCurrency(acct.account_size)} | Current Balance: {formatCurrency(acct.balance)}</p>
                        <p>Profit: {formatCurrency(profit)} | Min Required (5%): {formatCurrency(minRequired)}</p>
                        <p>
                          {isEligible 
                            ? <>Max Withdrawable (80% after 3% buffer): <span className="font-semibold text-primary">{formatCurrency(maxWithdraw)}</span></>
                            : <span className="text-destructive font-semibold">Not eligible – need {formatCurrency(minRequired - profit)} more profit</span>
                          }
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  <Label>Withdrawal Amount (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="50"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10"
                      placeholder="Enter amount"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum withdrawal: $50</p>
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payoneer">Payoneer</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="crypto_btc">Crypto (BTC)</SelectItem>
                      <SelectItem value="crypto_usdt">Crypto (USDT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Payment Details</Label>
                  <Textarea
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                    placeholder={
                      paymentMethod === "payoneer" 
                        ? "Enter your Payoneer email address" 
                        : paymentMethod === "crypto_btc"
                        ? "Enter your BTC wallet address"
                        : paymentMethod === "crypto_usdt"
                        ? "Enter your USDT wallet address (specify network: TRC20/ERC20)"
                        : paymentMethod === "bank_transfer"
                        ? "Enter bank name, account number, SWIFT/BIC code, and account holder name"
                        : "Enter your payment details (email, wallet address, etc.)"
                    }
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4 mr-2" />
                      Request Withdrawal
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
            <CardDescription>Your recent withdrawal requests</CardDescription>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No withdrawal history</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-semibold">{formatCurrency(payout.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payout.requested_at).toLocaleDateString()} via{" "}
                        {payout.payment_method?.replace("_", " ") || "N/A"}
                      </p>
                    </div>
                    {getStatusBadge(payout.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PropDashboardLayout>
  );
};

export default PropWithdraw;
