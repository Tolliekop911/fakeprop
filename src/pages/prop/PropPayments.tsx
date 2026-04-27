import { useState, useEffect } from "react";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Loader2, Clock, CheckCircle, Package, AlertCircle, Building2, Bitcoin, XCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PaymentOrder {
  id: string;
  order_reference: string;
  program_type: string;
  account_size: number;
  amount: number;
  original_amount: number | null;
  payment_method: string;
  status: string;
  full_name: string | null;
  email: string | null;
  proof_of_payment_url: string | null;
  wct_payment_id: string | null;
  wct_payment_url: string | null;
  coupon_code: string | null;
  discount_percent: number | null;
  admin_notes: string | null;
  created_at: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

const PropPayments = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentOrder[]>([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("payment_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-3 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-500 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case "approved":
        return (
          <span className="px-3 py-1 text-xs rounded-full bg-green-500/10 text-green-500 flex items-center gap-1 font-medium">
            <CheckCircle className="w-3 h-3" /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-3 py-1 text-xs rounded-full bg-destructive/10 text-destructive flex items-center gap-1 font-medium">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return <span className="px-3 py-1 text-xs rounded-full bg-muted">{status}</span>;
    }
  };

  const getMethodIcon = (method: string) => {
    return method === "wire_transfer" ? (
      <Building2 className="w-4 h-4 text-primary" />
    ) : (
      <Bitcoin className="w-4 h-4 text-primary" />
    );
  };

  if (loading) {
    return (
      <PropDashboardLayout title="Payments">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PropDashboardLayout>
    );
  }

  const totalSpent = payments.filter(p => p.status === "approved").reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = payments.filter(p => p.status === "pending").length;
  const approvedCount = payments.filter(p => p.status === "approved").length;

  return (
    <PropDashboardLayout title="Payments">
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Payments are manually reviewed.</span>{" "}
            Account activation happens after approval. You'll be notified once your payment is verified.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Approved</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
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
                  <p className="text-2xl font-bold text-green-500">{approvedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Your challenge purchase payments</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h4 className="text-lg font-semibold mb-2">No Payments Yet</h4>
                <p className="text-muted-foreground">Purchase a challenge to see your payment history.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-xl border border-border p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        {getMethodIcon(payment.payment_method)}
                        <div>
                          <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-muted-foreground font-mono">{payment.order_reference}</p>
                        </div>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Plan</p>
                        <p className="font-medium">{payment.program_type?.toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Size</p>
                        <p className="font-medium">{formatCurrency(payment.account_size)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Method</p>
                        <p className="font-medium">{payment.payment_method === "wire_transfer" ? "Wire Transfer" : "Crypto"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium">{new Date(payment.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Extra details */}
                    {(payment.proof_of_payment_url || payment.wct_payment_url || payment.coupon_code || payment.admin_notes) && (
                      <div className="border-t border-border pt-3 space-y-2 text-sm">
                        {payment.coupon_code && (
                          <p className="text-muted-foreground">
                            Coupon: <span className="text-primary font-medium">{payment.coupon_code}</span> (-{payment.discount_percent}%)
                          </p>
                        )}
                        {payment.proof_of_payment_url && (
                          <a href={payment.proof_of_payment_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline">
                            <ExternalLink className="w-3 h-3" /> View Proof of Payment
                          </a>
                        )}
                        {payment.wct_payment_id && (
                          <p className="text-muted-foreground">
                            Payment ID: <span className="font-mono">{payment.wct_payment_id}</span>
                          </p>
                        )}
                        {payment.admin_notes && payment.status === "rejected" && (
                          <p className="text-destructive text-sm">
                            Reason: {payment.admin_notes}
                          </p>
                        )}
                      </div>
                    )}
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

export default PropPayments;
