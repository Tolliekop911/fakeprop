import { useState, useEffect } from "react";
import AdminPagination, { paginate } from "@/components/admin/AdminPagination";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  Building2,
  Bitcoin,
  ExternalLink,
  Clock,
  RefreshCw,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/adminLogger";

interface PaymentOrder {
  id: string;
  order_reference: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  program_type: string;
  account_size: number;
  amount: number;
  original_amount: number | null;
  payment_method: string;
  status: string;
  full_name: string | null;
  email: string | null;
  bank_account_used: string | null;
  proof_of_payment_url: string | null;
  wct_payment_id: string | null;
  coupon_code: string | null;
  discount_percent: number | null;
  admin_notes: string | null;
  created_at: string;
  // Linked challenge/account info
  linked_challenge_id?: string;
  linked_challenge_number?: string;
  linked_account_number?: string;
  linked_account_id?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

const PaymentOrdersManagement = () => {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrder | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState<PaymentOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user profiles (batched to avoid URL length limits)
      const userIds = [...new Set((data || []).map((o) => o.user_id))];
      const CHUNK = 100;
      const allProfiles: { user_id: string; email: string | null; full_name: string | null }[] = [];
      for (let i = 0; i < userIds.length; i += CHUNK) {
        const { data: batch } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", userIds.slice(i, i + CHUNK));
        if (batch) allProfiles.push(...batch);
      }

      const profileMap = allProfiles.reduce(
        (acc: Record<string, { email: string | null; full_name: string | null }>, p) => {
          acc[p.user_id] = { email: p.email, full_name: p.full_name };
          return acc;
        },
        {}
      );

      // For approved orders, look up linked accounts and challenges
      const approvedOrderUserIds = (data || [])
        .filter((o) => o.status === "approved")
        .map((o) => o.user_id);

      let challengeMap: Record<string, { challenge_id: string; challenge_number: string; account_number: string; account_id: string }> = {};

      if (approvedOrderUserIds.length > 0) {
        // Get accounts that match order user_id + account_size + program_type
        const { data: accountsData } = await supabase
          .from("accounts")
          .select("id, user_id, account_number, account_size, program_type")
          .in("user_id", [...new Set(approvedOrderUserIds)]);

        const { data: challengesData } = await supabase
          .from("challenges")
          .select("id, challenge_number, account_id, user_id, account_size, program_type")
          .in("user_id", [...new Set(approvedOrderUserIds)]);

        // For each approved order, find matching challenge by admin_notes (has account number) or by user+size+program
        for (const order of (data || []).filter((o) => o.status === "approved")) {
          // Try to extract account number from admin_notes
          const noteMatch = order.admin_notes?.match(/Account:\s*(PROP-[A-Z0-9]+)/);
          const matchedAccount = noteMatch
            ? (accountsData || []).find((a) => a.account_number === noteMatch[1])
            : (accountsData || []).find(
                (a) => a.user_id === order.user_id && Number(a.account_size) === Number(order.account_size)
              );

          if (matchedAccount) {
            const matchedChallenge = (challengesData || []).find((c) => c.account_id === matchedAccount.id);
            if (matchedChallenge) {
              challengeMap[order.id] = {
                challenge_id: matchedChallenge.id,
                challenge_number: matchedChallenge.challenge_number,
                account_number: matchedAccount.account_number,
                account_id: matchedAccount.id,
              };
            } else {
              challengeMap[order.id] = {
                challenge_id: "",
                challenge_number: "",
                account_number: matchedAccount.account_number,
                account_id: matchedAccount.id,
              };
            }
          }
        }
      }

      setOrders(
        (data || []).map((o) => ({
          ...o,
          user_email: profileMap[o.user_id]?.email || o.email || undefined,
          user_name: profileMap[o.user_id]?.full_name || o.full_name || undefined,
          linked_challenge_id: challengeMap[o.id]?.challenge_id || undefined,
          linked_challenge_number: challengeMap[o.id]?.challenge_number || undefined,
          linked_account_number: challengeMap[o.id]?.account_number || undefined,
          linked_account_id: challengeMap[o.id]?.account_id || undefined,
        }))
      );
    } catch (e) {
      console.error("Error loading payment orders:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (order: PaymentOrder) => {
    setProcessingId(order.id);
    try {
      const size = order.account_size;
      const effectiveProgramType = order.program_type.replace("halfway-", "");
      // Determine starting phase based on program type
      const phase = order.program_type === "2-step" || order.program_type === "halfway-2" ? "phase1" : "phase1";

      // 1. Fetch rules for this program/size
      const { data: ruleData, error: ruleError } = await supabase
        .from("rules")
        .select("*")
        .eq("program_type", effectiveProgramType)
        .eq("account_size", size)
        .maybeSingle();

      if (ruleError || !ruleData) {
        toast({
          title: "Rules Not Found",
          description: `No rules configured for ${effectiveProgramType} / $${size}. Please add rules first.`,
          variant: "destructive",
        });
        setProcessingId(null);
        return;
      }

      // 2. Create account
      const accountNumber = `PROP-${Array.from(crypto.getRandomValues(new Uint8Array(6)), b => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[b % 36]).join('')}`;

      const { error: accountError, data: accountData } = await supabase
        .from("accounts")
        .insert({
          user_id: order.user_id,
          account_number: accountNumber,
          account_type: "prop",
          account_size: size,
          balance: size,
          equity: size,
          status: "active",
          phase,
          program_type: effectiveProgramType,
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // 3. Create challenge
      const challengeNumber = `CH-${Array.from(crypto.getRandomValues(new Uint8Array(8)), b => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[b % 36]).join('')}`;
      const profitTargetPercent = phase === "phase1"
        ? ruleData.profit_target_phase1
        : phase === "phase2"
        ? (ruleData.profit_target_phase2 ?? 0)
        : 0;
      const profitTargetAmount = size * (profitTargetPercent / 100);
      const maxDrawdownPercent = ruleData.max_drawdown;
      const maxDrawdownAmount = size * (maxDrawdownPercent / 100);

      const { data: challengeData, error: challengeError } = await supabase
        .from("challenges")
        .insert({
          user_id: order.user_id,
          account_id: accountData.id,
          challenge_number: challengeNumber,
          program_type: effectiveProgramType,
          account_size: size,
          current_balance: size,
          profit_target_percent: profitTargetPercent,
          profit_target_amount: profitTargetAmount,
          max_drawdown_percent: maxDrawdownPercent,
          max_drawdown_amount: maxDrawdownAmount,
          daily_drawdown_percent: ruleData.daily_drawdown,
          min_trading_days: ruleData.min_trading_days,
          phase,
          status: "active",
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // 4. Update payment order to approved
      const { error: updateError } = await supabase
        .from("payment_orders")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || `Auto-provisioned. Account: ${accountNumber}`,
        })
        .eq("id", order.id);

      if (updateError) throw updateError;

      // 5. Call external API with challengeId
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", order.user_id)
        .maybeSingle();

      if (profileData) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        const { data: apiResult, error: apiError } = await supabase.functions.invoke("create-challenge-account", {
          body: { userId: order.user_id, profileId: profileData.id, challengeId: challengeData.id },
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

        if (apiError || apiResult?.error) {
          console.error("External API call failed, rolling back:", apiError || apiResult?.error);
          // Rollback: delete challenge and account records, revert payment order
          await supabase.from("challenges").delete().eq("id", challengeData.id);
          await supabase.from("accounts").delete().eq("id", accountData.id);
          await supabase.from("payment_orders").update({ status: "pending", reviewed_at: null, admin_notes: null }).eq("id", order.id);
          toast({
            title: "Provisioning Failed",
            description: "External API failed. Account and challenge records have been rolled back.",
            variant: "destructive",
          });
          setProcessingId(null);
          loadOrders();
          return;
        } else {
          console.log("External API response:", apiResult);
        }
      } else {
        // No profile found — rollback
        await supabase.from("challenges").delete().eq("id", challengeData.id);
        await supabase.from("accounts").delete().eq("id", accountData.id);
        await supabase.from("payment_orders").update({ status: "pending", reviewed_at: null, admin_notes: null }).eq("id", order.id);
        toast({
          title: "Provisioning Failed",
          description: "Could not find user profile. Records rolled back.",
          variant: "destructive",
        });
        setProcessingId(null);
        loadOrders();
        return;
      }

      // 6. Log admin action
      await logAdminAction("payment_approved", "payment_order", order.id, {
        order_reference: order.order_reference,
        amount: order.amount,
        user_id: order.user_id,
        account_number: accountNumber,
        challenge_number: challengeNumber,
      });

      toast({
        title: "Payment Approved & Account Provisioned",
        description: `Order ${order.order_reference} approved. Account ${accountNumber} created for ${order.user_name || order.user_email || "user"}.`,
      });
      setSelectedOrder(null);
      setAdminNotes("");
      loadOrders();
    } catch (e: any) {
      console.error("handleApprove error:", e);
      toast({ title: "Error", description: e.message || "Failed to approve and provision", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingOrder) return;
    setProcessingId(rejectingOrder.id);
    try {
      const { error } = await supabase
        .from("payment_orders")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          admin_notes: rejectReason || "Payment rejected",
        })
        .eq("id", rejectingOrder.id);

      if (error) throw error;
      await logAdminAction("payment_rejected", "payment_order", rejectingOrder.id, {
        order_reference: rejectingOrder.order_reference,
        amount: rejectingOrder.amount,
        user_id: rejectingOrder.user_id,
        reason: rejectReason,
      });
      toast({ title: "Payment Rejected", description: `Order ${rejectingOrder.order_reference} has been rejected.` });
      setRejectDialogOpen(false);
      setRejectingOrder(null);
      setRejectReason("");
      setSelectedOrder(null);
      loadOrders();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-500 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case "approved":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-500 flex items-center gap-1 w-fit">
            <CheckCircle className="w-3 h-3" /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-destructive/10 text-destructive flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-muted">{status}</span>;
    }
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    if (!normalizedSearchQuery) return matchesStatus;

    const name = (o.user_name ?? "").toLowerCase();
    const email = (o.user_email ?? "").toLowerCase();
    const reference = (o.order_reference ?? "").toLowerCase();

    const matchesSearch =
      name.includes(normalizedSearchQuery) ||
      email.includes(normalizedSearchQuery) ||
      reference.includes(normalizedSearchQuery);

    return matchesStatus && matchesSearch;
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-heading font-bold">Payment Orders</h3>
          <p className="text-sm text-muted-foreground">
            Review and manage challenge purchase payments.{" "}
            {pendingCount > 0 && (
              <span className="text-yellow-500 font-semibold">{pendingCount} pending review</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrders} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or reference..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "pending", "approved", "rejected"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-3 text-sm font-semibold text-muted-foreground">Reference</th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-muted-foreground">User</th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-muted-foreground">Plan</th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-muted-foreground">Amount</th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-muted-foreground">Method</th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-muted-foreground">Challenge / Account</th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-muted-foreground">Status</th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-muted-foreground">Date</th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-muted-foreground">
                  No payment orders found
                </td>
              </tr>
            ) : (
              paginate(filteredOrders, page, PAGE_SIZE).map((order) => (
                <tr key={order.id} className={`border-b border-border/50 hover:bg-muted/20 ${order.status === "pending" ? "bg-yellow-500/5" : ""}`}>
                  <td className="py-3 px-3 font-mono text-xs">{order.order_reference || `ORD-${order.id.slice(0, 8)}`}</td>
                  <td className="py-3 px-3 text-sm">
                    <div>
                      <p className="font-medium truncate max-w-[150px]">{order.user_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{order.user_email || "—"}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-sm">
                    <p className="font-medium">{order.program_type?.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(order.account_size)}</p>
                  </td>
                  <td className="py-3 px-3 font-semibold text-primary text-sm">{formatCurrency(order.amount)}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 text-sm">
                      {order.payment_method === "wire_transfer" ? (
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Bitcoin className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span>{order.payment_method === "wire_transfer" ? "Wire" : "Crypto"}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-sm">
                    {order.linked_challenge_number ? (
                      <div>
                        <Link
                          to={`/prop/account/${order.linked_challenge_id}`}
                          className="text-primary hover:underline font-mono text-xs"
                        >
                          {order.linked_challenge_number}
                        </Link>
                        {order.linked_account_number && (
                          <p className="text-xs text-muted-foreground">{order.linked_account_number}</p>
                        )}
                      </div>
                    ) : order.linked_account_number ? (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{order.linked_account_number}</code>
                    ) : order.status === "approved" ? (
                      <span className="text-xs text-muted-foreground">Not found</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3">{getStatusBadge(order.status)}</td>
                  <td className="py-3 px-3 text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setAdminNotes(order.admin_notes || "");
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {order.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                            onClick={() => handleApprove(order)}
                            disabled={processingId === order.id}
                          >
                            {processingId === order.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => {
                              setRejectingOrder(order);
                              setRejectDialogOpen(true);
                            }}
                            disabled={processingId === order.id}
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination currentPage={page} totalItems={filteredOrders.length} pageSize={PAGE_SIZE} onPageChange={setPage} loading={loading} />
      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder?.order_reference}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">{selectedOrder.user_name || selectedOrder.full_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedOrder.user_email || selectedOrder.email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Program</p>
                  <p className="font-medium">{selectedOrder.program_type?.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Size</p>
                  <p className="font-medium">{formatCurrency(selectedOrder.account_size)}</p>
                </div>
                {(selectedOrder.linked_challenge_number || selectedOrder.linked_account_number) && (
                  <div className="col-span-2 bg-muted/30 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs mb-1">Linked Challenge / Account</p>
                    <div className="flex items-center gap-3">
                      {selectedOrder.linked_challenge_number && (
                        <Link
                          to={`/prop/account/${selectedOrder.linked_challenge_id}`}
                          className="text-primary hover:underline font-mono text-sm font-medium"
                        >
                          {selectedOrder.linked_challenge_number}
                        </Link>
                      )}
                      {selectedOrder.linked_account_number && (
                        <code className="text-xs bg-muted px-2 py-1 rounded">{selectedOrder.linked_account_number}</code>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold text-primary">{formatCurrency(selectedOrder.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Method</p>
                  <p className="font-medium flex items-center gap-1">
                    {selectedOrder.payment_method === "wire_transfer" ? (
                      <><Building2 className="w-3.5 h-3.5" /> Wire Transfer</>
                    ) : (
                      <><Bitcoin className="w-3.5 h-3.5" /> Crypto</>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
              </div>

              {selectedOrder.coupon_code && (
                <div className="bg-primary/10 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">Coupon Applied</p>
                  <p className="font-semibold text-primary">
                    {selectedOrder.coupon_code}
                    {selectedOrder.discount_percent != null && selectedOrder.discount_percent > 0
                      ? ` (-${selectedOrder.discount_percent}%)`
                      : ""}
                  </p>
                  {selectedOrder.original_amount && (
                    <p className="text-xs text-muted-foreground">
                      Original: {formatCurrency(selectedOrder.original_amount)}
                    </p>
                  )}
                </div>
              )}

              {selectedOrder.bank_account_used && (
                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">Bank Account Used</p>
                  <p className="font-mono font-medium">{selectedOrder.bank_account_used}</p>
                </div>
              )}

              {selectedOrder.wct_payment_id && (
                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">Crypto Payment ID</p>
                  <p className="font-mono font-medium">{selectedOrder.wct_payment_id}</p>
                </div>
              )}

              {selectedOrder.proof_of_payment_url && (
                <a
                  href={selectedOrder.proof_of_payment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline text-sm bg-primary/5 rounded-lg p-3"
                >
                  <ExternalLink className="w-4 h-4" /> View Proof of Payment
                </a>
              )}

              {/* Admin Notes */}
              {selectedOrder.status === "pending" && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-sm font-medium">Admin Notes (optional)</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add any notes before approving/rejecting..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleApprove(selectedOrder)}
                      disabled={processingId === selectedOrder.id}
                    >
                      {processingId === selectedOrder.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Approve Payment
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        setRejectingOrder(selectedOrder);
                        setRejectDialogOpen(true);
                      }}
                      disabled={processingId === selectedOrder.id}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </div>
                </div>
              )}

              {selectedOrder.admin_notes && selectedOrder.status !== "pending" && (
                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">Admin Notes</p>
                  <p>{selectedOrder.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting order {rejectingOrder?.order_reference}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (visible to user)..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReject}
                disabled={processingId === rejectingOrder?.id}
              >
                {processingId === rejectingOrder?.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Reject Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentOrdersManagement;
