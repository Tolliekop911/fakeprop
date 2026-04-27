import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Link2, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const COMMISSION_RATE = 0.40; // 40%

const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
};

interface ReferralData {
  email: string | null;
  full_name: string | null;
  created_at: string;
  user_id: string;
  totalSpent: number;
  purchaseCount: number;
  commission: number;
}

const PropAffiliate = () => {
  const { toast } = useToast();
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("affiliate_code")
        .eq("user_id", user.id)
        .maybeSingle();
      const code = (data as any)?.affiliate_code ?? null;
      setAffiliateCode(code);

      if (code) {
        // Fetch referred profiles
        const { data: refs } = await (supabase
          .from("profiles")
          .select("email, full_name, created_at, user_id") as any)
          .eq("referred_by", code);

        const referredUsers: any[] = refs || [];

        if (referredUsers.length > 0) {
          // Fetch approved payment orders for all referred users
          const userIds = referredUsers.map((r: any) => r.user_id);
          const { data: payments } = await supabase
            .from("payment_orders")
            .select("user_id, amount, status")
            .in("user_id", userIds)
            .eq("status", "approved");

          const paymentsByUser: Record<string, { total: number; count: number }> = {};
          (payments || []).forEach((p) => {
            if (!paymentsByUser[p.user_id]) paymentsByUser[p.user_id] = { total: 0, count: 0 };
            paymentsByUser[p.user_id].total += Number(p.amount);
            paymentsByUser[p.user_id].count += 1;
          });

          let earnings = 0;
          const enriched: ReferralData[] = referredUsers.map((r: any) => {
            const pData = paymentsByUser[r.user_id] || { total: 0, count: 0 };
            const commission = pData.total * COMMISSION_RATE;
            earnings += commission;
            return {
              email: r.email,
              full_name: r.full_name,
              created_at: r.created_at,
              user_id: r.user_id,
              totalSpent: pData.total,
              purchaseCount: pData.count,
              commission,
            };
          });

          setReferrals(enriched);
          setTotalEarnings(earnings);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const code = generateCode();
    const { error } = await (supabase
      .from("profiles") as any)
      .update({ affiliate_code: code })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: "Failed to generate code.", variant: "destructive" });
    } else {
      setAffiliateCode(code);
      toast({ title: "Code Generated", description: `Your affiliate code is ${code}` });
    }
    setGenerating(false);
  };

  const affiliateLink = affiliateCode
    ? `https://www.kuberaglobalmarkets.com/prop/signup?ref=${affiliateCode}`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(affiliateLink);
    toast({ title: "Link Copied", description: "Your affiliate link has been copied to clipboard." });
  };

  const handleCopyCode = () => {
    if (!affiliateCode) return;
    navigator.clipboard.writeText(affiliateCode);
    toast({ title: "Code Copied", description: "Your affiliate code has been copied to clipboard." });
  };

  const activePurchasers = referrals.filter(r => r.purchaseCount > 0).length;

  return (
    <PropDashboardLayout title="Affiliate Program">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{referrals.length}</p>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{activePurchasers}</p>
                  <p className="text-sm text-muted-foreground">Purchased</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Total Earnings (40%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Available to Withdraw</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Affiliate Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Your Affiliate Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : !affiliateCode ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Generate your unique affiliate code to start earning commissions on referrals.
                </p>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your Code</p>
                  <div className="flex gap-2">
                    <Input value={affiliateCode} readOnly className="font-mono text-sm max-w-[200px]" />
                    <Button variant="outline" size="sm" onClick={handleCopyCode}>Copy</Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your Referral Link</p>
                  <div className="flex gap-2">
                    <Input value={affiliateLink} readOnly className="font-mono text-sm" />
                    <Button onClick={handleCopyLink}>Copy Link</Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this link or code with traders. You earn <strong>40% commission</strong> on every approved challenge purchase made through your referral.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referrals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">No referrals yet</p>
                <p className="text-sm">Share your affiliate link to start earning commissions.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Purchases</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                      <TableHead className="text-right">Your Commission (40%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                        <TableCell>{r.email || "—"}</TableCell>
                        <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {r.purchaseCount > 0 ? (
                            <Badge variant="secondary">{r.purchaseCount}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${r.totalSpent.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-primary font-semibold">
                          ${r.commission.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PropDashboardLayout>
  );
};

export default PropAffiliate;
