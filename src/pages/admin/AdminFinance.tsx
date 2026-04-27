import { useState, useEffect } from "react";
import AdminPagination, { paginate } from "@/components/admin/AdminPagination";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Eye,
  AlertCircle,
  Loader2,
  Package,
  CreditCard,
  Building2,
  Bitcoin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/adminLogger";

interface Payout {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  full_amount: number | null;
  status: string;
  payment_method: string | null;
  payment_details: unknown | null;
  requested_at: string;
  created_at: string;
  processed_at: string | null;
  admin_notes: string | null;
  user_email?: string;
  user_name?: string;
  kyc_status?: string;
}

interface PaymentOrder {
  id: string;
  order_reference: string;
  user_id: string;
  program_type: string;
  account_size: number;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}
const normalizePaymentDetails = (paymentDetails: unknown): Record<string, string> => {
  if (!paymentDetails) return {};

  let parsed: unknown = paymentDetails;

  const tryParseJson = (value: string): unknown => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed) return {};
    parsed = tryParseJson(trimmed);
  }

  if (Array.isArray(parsed)) {
    const firstNonEmpty = parsed.find((item) => item !== null && item !== undefined && String(item).trim() !== "");
    if (!firstNonEmpty) return {};
    parsed = typeof firstNonEmpty === "string" ? tryParseJson(firstNonEmpty.trim()) : firstNonEmpty;
  }

  if (typeof parsed !== "object" || parsed === null) {
    const text = String(parsed).trim();
    return text ? { details: text } : {};
  }

  const baseRecord = parsed as Record<string, unknown>;
  const nestedDetails = baseRecord.details;

  const record =
    nestedDetails && typeof nestedDetails === "object" && !Array.isArray(nestedDetails)
      ? (nestedDetails as Record<string, unknown>)
      : baseRecord;

  const normalized = Object.entries(record).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === null || value === undefined) return acc;

    if (typeof value === "string") {
      const text = value.trim();
      if (text) acc[key] = text;
      return acc;
    }

    if (typeof value === "object") {
      const json = JSON.stringify(value);
      if (json && json !== "{}" && json !== "[]") acc[key] = json;
      return acc;
    }

    acc[key] = String(value);
    return acc;
  }, {});

  if (Object.keys(normalized).length === 0) {
    const raw = JSON.stringify(baseRecord);
    if (raw && raw !== "{}") return { details: raw };
  }

  return normalized;
};

const AdminFinance = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetchPayouts();
  }, [statusFilter]);

  useEffect(() => {
    fetchPaymentOrders();
  }, [orderStatusFilter]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("payouts")
        .select("*")
        .order("requested_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Batch fetch user profiles
      const userIds = [...new Set((data || []).map((p) => p.user_id))];
      const CHUNK = 100;
      const allProfiles: { user_id: string; email: string | null; full_name: string | null }[] = [];
      const allKyc: { user_id: string; status: string }[] = [];
      for (let i = 0; i < userIds.length; i += CHUNK) {
        const chunk = userIds.slice(i, i + CHUNK);
        const [profileBatch, kycBatch] = await Promise.all([
          supabase.from("profiles").select("user_id, email, full_name").in("user_id", chunk),
          supabase.from("kyc_submissions").select("user_id, status").in("user_id", chunk).order("submitted_at", { ascending: false }),
        ]);
        if (profileBatch.data) allProfiles.push(...profileBatch.data);
        if (kycBatch.data) allKyc.push(...kycBatch.data);
      }
      const profileMap = allProfiles.reduce(
        (acc: Record<string, { email: string | null; full_name: string | null }>, p) => {
          acc[p.user_id] = { email: p.email, full_name: p.full_name };
          return acc;
        }, {}
      );
      // Take most recent KYC per user (already ordered desc)
      const kycMap = allKyc.reduce((acc: Record<string, string>, k) => {
        if (!acc[k.user_id]) acc[k.user_id] = k.status;
        return acc;
      }, {});

      const payoutsWithUsers = (data || []).map((payout) => ({
        ...payout,
        user_email: profileMap[payout.user_id]?.email || undefined,
        user_name: profileMap[payout.user_id]?.full_name || undefined,
        kyc_status: kycMap[payout.user_id] || "none",
      }));

      setPayouts(payoutsWithUsers);
    } catch (error) {
      console.error("Error fetching payouts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentOrders = async () => {
    setOrdersLoading(true);
    try {
      let query = supabase
        .from("payment_orders")
        .select("id, order_reference, user_id, program_type, account_size, amount, payment_method, status, created_at, email, full_name")
        .order("created_at", { ascending: false });

      if (orderStatusFilter !== "all") {
        query = query.eq("status", orderStatusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

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
        }, {}
      );
      setPaymentOrders(
        (data || []).map((o) => ({
          ...o,
          user_email: profileMap[o.user_id]?.email || o.email || undefined,
          user_name: profileMap[o.user_id]?.full_name || o.full_name || undefined,
        }))
      );
    } catch (error) {
      console.error("Error fetching payment orders:", error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
    setProcessingId(orderId);
    try {
      const order = paymentOrders.find((o) => o.id === orderId);

      if (newStatus === "approved" && order) {
        // Auto-provision: fetch rules, create account + challenge, call external API
        const effectiveProgramType = order.program_type.replace("halfway-", "");

        const { data: ruleData, error: ruleError } = await supabase
          .from("rules")
          .select("*")
          .eq("program_type", effectiveProgramType)
          .eq("account_size", order.account_size)
          .single();

        if (ruleError || !ruleData) {
          toast({
            variant: "destructive",
            title: "Rules Not Found",
            description: `No rules configured for ${effectiveProgramType} / $${order.account_size.toLocaleString()}. Please add rules first.`,
          });
          setProcessingId(null);
          return;
        }

        const accountNumber = `PROP-${Array.from(crypto.getRandomValues(new Uint8Array(6)), b => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[b % 36]).join('')}`;
        const phase = "phase1";

        const { error: accountError, data: accountData } = await supabase
          .from("accounts")
          .insert({
            user_id: order.user_id,
            account_number: accountNumber,
            account_type: "prop",
            account_size: order.account_size,
            balance: order.account_size,
            equity: order.account_size,
            status: "active",
            phase,
            program_type: effectiveProgramType,
          })
          .select()
          .single();

        if (accountError) throw accountError;

        const challengeNumber = `CH-${Array.from(crypto.getRandomValues(new Uint8Array(8)), b => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[b % 36]).join('')}`;
        const profitTargetPercent = ruleData.profit_target_phase1;
        const profitTargetAmount = order.account_size * (profitTargetPercent / 100);
        const maxDrawdownPercent = ruleData.max_drawdown;
        const maxDrawdownAmount = order.account_size * (maxDrawdownPercent / 100);

        const { data: challengeData, error: challengeError } = await supabase
          .from("challenges")
          .insert({
            user_id: order.user_id,
            account_id: accountData.id,
            challenge_number: challengeNumber,
            program_type: effectiveProgramType,
            account_size: order.account_size,
            current_balance: order.account_size,
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

        // Update payment order to approved
        await supabase
          .from("payment_orders")
          .update({
            status: "approved",
            admin_notes: `Auto-provisioned. Account: ${accountNumber}`,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        // Call external API
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", order.user_id)
          .single();

        if (profileData) {
          const { data: apiResult, error: apiError } = await supabase.functions.invoke("create-challenge-account", {
            body: { userId: order.user_id, profileId: profileData.id, challengeId: challengeData.id },
          });
          if (apiError || apiResult?.error) {
            console.error("External API call failed, rolling back:", apiError || apiResult?.error);
            // Rollback: delete challenge and account records
            await supabase.from("challenges").delete().eq("id", challengeData.id);
            await supabase.from("accounts").delete().eq("id", accountData.id);
            // Revert payment order status
            await supabase.from("payment_orders").update({ status: "pending", admin_notes: null, reviewed_at: null }).eq("id", orderId);
            toast({ variant: "destructive", title: "Provisioning Failed", description: "External API failed. Account and challenge records have been rolled back." });
            setProcessingId(null);
            fetchPaymentOrders();
            return;
          }
        } else {
          // No profile found — rollback
          await supabase.from("challenges").delete().eq("id", challengeData.id);
          await supabase.from("accounts").delete().eq("id", accountData.id);
          await supabase.from("payment_orders").update({ status: "pending", admin_notes: null, reviewed_at: null }).eq("id", orderId);
          toast({ variant: "destructive", title: "Provisioning Failed", description: "Could not find user profile. Records rolled back." });
          setProcessingId(null);
          fetchPaymentOrders();
          return;
        }

        await logAdminAction("payment_approved", "payment_order", orderId, {
          order_reference: order.order_reference,
          amount: order.amount,
          user_id: order.user_id,
          account_number: accountNumber,
          challenge_number: challengeNumber,
        });

        toast({ title: "Approved & Provisioned", description: `Account ${accountNumber} created for ${order.user_name || order.user_email || "user"}.` });
      } else {
        // Non-approve status change (e.g. rejected)
        const { error } = await supabase
          .from("payment_orders")
          .update({ status: newStatus, reviewed_at: new Date().toISOString() })
          .eq("id", orderId);
        if (error) throw error;

        await logAdminAction(`payment_${newStatus}`, "payment_order", orderId, {
          order_reference: order?.order_reference,
          amount: order?.amount,
          user_id: order?.user_id,
        });

        toast({ title: "Updated", description: `Order marked as ${newStatus}` });
      }

      fetchPaymentOrders();
    } catch (error: any) {
      console.error("handleOrderStatusChange error:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update order status" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusChange = async (payoutId: string, newStatus: string) => {
    setProcessingId(payoutId);
    try {
      const payout = payouts.find(p => p.id === payoutId);

      // When approving, validate the withdrawal amount against rules and call doWithdrawal
      if (newStatus === "approved") {
        // Check KYC approval before allowing payout approval
        const { data: kycData } = await supabase
          .from("kyc_submissions")
          .select("status")
          .eq("user_id", payout?.user_id)
          .eq("status", "approved")
          .limit(1)
          .maybeSingle();

        if (!kycData) {
          toast({
            variant: "destructive",
            title: "KYC Not Approved",
            description: `This user's KYC has not been approved yet. Please ensure KYC is approved in Compliance before approving payouts.`,
          });
          setProcessingId(null);
          return;
        }
        // Fetch the challenge for this account to validate profit
        const { data: challenge } = await supabase
          .from("challenges")
          .select("account_size, current_balance, phase")
          .eq("account_id", payout?.account_id)
          .eq("phase", "funded")
          .eq("status", "active")
          .single();

        if (!challenge) {
          toast({ variant: "destructive", title: "Validation Failed", description: "No active funded challenge found for this account." });
          setProcessingId(null);
          return;
        }

        const profit = challenge.current_balance - challenge.account_size;
        const maxWithdrawable = profit * 0.8;
        const minGrossProfit = challenge.account_size * 0.02;

        if (profit < minGrossProfit) {
          toast({
            variant: "destructive",
            title: "Insufficient Profit",
            description: `Trader needs at least 2% gross profit ($${minGrossProfit.toFixed(2)}). Current profit: $${profit.toFixed(2)}.`,
          });
          setProcessingId(null);
          return;
        }

        if ((payout?.amount || 0) > maxWithdrawable) {
          toast({
            variant: "destructive",
            title: "Amount Exceeds Limit",
            description: `Requested $${payout?.amount.toFixed(2)} but max is $${maxWithdrawable.toFixed(2)} (80% of $${profit.toFixed(2)} profit).`,
          });
          setProcessingId(null);
          return;
        }

        // Call Condor backapi to reset the trading account balance
        // Look up the challenge ID linked to this payout's account
        const { data: challengeData } = await supabase
          .from("challenges")
          .select("id")
          .eq("account_id", payout?.account_id)
          .eq("phase", "funded")
          .limit(1)
          .maybeSingle();

        const condorChallengeId = challengeData?.id || payout?.account_id;

        // Call Condor backapi to reset the trading account balance
        const { data: apiResult, error: apiError } = await supabase.functions.invoke("manage-condor-account", {
          body: {
            action: "doWithdrawal",
            challengeId: condorChallengeId,
            payoutId: payoutId,
          },
        });

        if (apiError) {
          console.error("doWithdrawal failed:", apiError);
          toast({
            variant: "destructive",
            title: "Withdrawal Processing Failed",
            description: `External API error: ${apiError.message || "Unknown error"}. Payout NOT approved.`,
          });
          setProcessingId(null);
          return;
        }

        if (apiResult?.error) {
          console.error("doWithdrawal returned error:", apiResult);
          toast({
            variant: "destructive",
            title: "Withdrawal Processing Failed",
            description: `${apiResult.error}. Payout NOT approved.`,
          });
          setProcessingId(null);
          return;
        }

        console.log("doWithdrawal succeeded:", apiResult);
        toast({ title: "Withdrawal Processed", description: "Account reset via external API." });
      }

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "paid" || newStatus === "rejected") {
        updateData.processed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("payouts")
        .update(updateData)
        .eq("id", payoutId);

      if (error) throw error;

      await logAdminAction(`payout_${newStatus}`, "payout", payoutId, {
        amount: payout?.amount,
        user_id: payout?.user_id,
      });

      toast({
        title: "Status Updated",
        description: `Payout marked as ${newStatus}`,
      });

      fetchPayouts();
    } catch (error) {
      console.error("Error updating payout:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update payout status",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const normalizedPayoutSearchQuery = searchQuery.trim().toLowerCase();
  const normalizedOrderSearchQuery = orderSearchQuery.trim().toLowerCase();

  const filteredPayouts = payouts.filter((p) => {
    if (!normalizedPayoutSearchQuery) return true;

    const email = (p.user_email ?? "").toLowerCase();
    const name = (p.user_name ?? "").toLowerCase();
    const id = (p.id ?? "").toLowerCase();

    return (
      email.includes(normalizedPayoutSearchQuery) ||
      name.includes(normalizedPayoutSearchQuery) ||
      id.includes(normalizedPayoutSearchQuery)
    );
  });

  const filteredOrders = paymentOrders.filter((o) => {
    if (!normalizedOrderSearchQuery) return true;

    const email = (o.user_email ?? "").toLowerCase();
    const name = (o.user_name ?? "").toLowerCase();
    const reference = (o.order_reference ?? "").toLowerCase();

    return (
      email.includes(normalizedOrderSearchQuery) ||
      name.includes(normalizedOrderSearchQuery) ||
      reference.includes(normalizedOrderSearchQuery)
    );
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 text-xs rounded bg-yellow-500/10 text-yellow-500">Pending</span>;
      case "approved":
        return <span className="px-2 py-1 text-xs rounded bg-blue-500/10 text-blue-500">Approved</span>;
      case "paid":
        return <span className="px-2 py-1 text-xs rounded bg-green-500/10 text-green-500">Paid</span>;
      case "rejected":
        return <span className="px-2 py-1 text-xs rounded bg-destructive/10 text-destructive">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground">{status}</span>;
    }
  };

  const getKycBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/10 text-primary">
            <CheckCircle className="w-3 h-3" /> KYC Verified
          </span>
        );
      case "pending":
      case "under_review":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-yellow-500/10 text-yellow-500">
            <Clock className="w-3 h-3" /> KYC Pending
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-destructive/10 text-destructive">
            <XCircle className="w-3 h-3" /> KYC Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-muted text-muted-foreground">
            <AlertCircle className="w-3 h-3" /> KYC Missing
          </span>
        );
    }
  };
  const stats = {
    pending: payouts.filter((p) => p.status === "pending").length,
    pendingAmount: payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0),
    approved: payouts.filter((p) => p.status === "approved").length,
    paidThisMonth: payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
    totalRequests: payouts.length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary/30 border-b border-border/20 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link to="/roots" className="p-2 hover:bg-muted rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-heading font-bold">Finance Management</h1>
            <p className="text-sm text-muted-foreground">Process withdrawal requests and payouts</p>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(stats.pendingAmount)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Approved</span>
            </div>
            <p className="text-2xl font-bold">{stats.approved}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Paid This Month</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(stats.paidThisMonth)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Requests</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalRequests}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPayoutsPage(1);
              }}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {["all", "pending", "approved", "paid", "rejected"].map((status) => (
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

        {/* Payouts Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No payout requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">User / KYC</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Full Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Client (80%)</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Our Cut (20%)</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Method</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Requested</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginate(filteredPayouts, payoutsPage, PAGE_SIZE).map((payout) => {
                    const fullAmt = payout.full_amount || (payout.amount / 0.8);
                    const ourCut = fullAmt - payout.amount;
                    return (
                    <tr key={payout.id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="py-4 px-4">
                        <p className="font-medium">{payout.user_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{payout.user_email}</p>
                        <div className="mt-2">{getKycBadge(payout.kyc_status)}</div>
                      </td>
                      <td className="py-4 px-4 font-semibold">{formatCurrency(fullAmt)}</td>
                      <td className="py-4 px-4 font-semibold text-primary">{formatCurrency(payout.amount)}</td>
                      <td className="py-4 px-4 font-semibold text-muted-foreground">{formatCurrency(ourCut)}</td>
                      <td className="py-4 px-4">
                        <p className="text-sm">{payout.payment_method || "Not specified"}</p>
                        {/* DEBUG: raw payment_details value */}
                        <p className="mt-1 text-[10px] text-yellow-500 font-mono break-all max-w-[320px]">
                          [RAW: {payout.payment_details === null ? 'NULL' : payout.payment_details === undefined ? 'UNDEFINED' : (() => { try { return JSON.stringify(payout.payment_details); } catch { return 'UNSTRINGIFIABLE'; } })()}]
                        </p>
                        {(() => {
                          try {
                            const details = normalizePaymentDetails(payout.payment_details);
                            const detailEntries = Object.entries(details);

                            if (detailEntries.length > 0) {
                              return (
                                <div className="mt-1 text-xs text-muted-foreground space-y-0.5 max-w-[320px]">
                                  {detailEntries.map(([key, value]) => (
                                    <p key={key} className="leading-relaxed" title={value}>
                                      <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                                      <span className="font-mono break-all">{value}</span>
                                    </p>
                                  ))}
                                </div>
                              );
                            }

                            return null;
                          } catch (e) {
                            console.error("Error parsing payment details:", e);
                            return <p className="text-xs text-destructive">Error parsing details</p>;
                          }
                        })()}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {payout.requested_at && new Date(payout.requested_at).getFullYear() > 1971
                          ? new Date(payout.requested_at).toLocaleDateString()
                          : new Date(payout.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">{getStatusBadge(payout.status)}</td>
                      <td className="py-4 px-4">
                        {processingId === payout.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : payout.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-500 hover:bg-green-500/10"
                              onClick={() => handleStatusChange(payout.id, "approved")}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleStatusChange(payout.id, "rejected")}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : payout.status === "approved" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-500 hover:bg-green-500/10"
                            onClick={() => handleStatusChange(payout.id, "paid")}
                          >
                            Mark Paid
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <AdminPagination currentPage={payoutsPage} totalItems={filteredPayouts.length} pageSize={PAGE_SIZE} onPageChange={setPayoutsPage} loading={loading} />
        </div>

        {/* Payment Orders Section */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-heading font-bold">Payment Orders</h2>
              <p className="text-sm text-muted-foreground">
                Challenge purchase payment orders.{" "}
                {paymentOrders.filter(o => o.status === "pending").length > 0 && (
                  <span className="text-yellow-500 font-semibold">
                    {paymentOrders.filter(o => o.status === "pending").length} pending review
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {["all", "pending", "approved", "rejected"].map((status) => (
                <Button
                  key={status}
                  variant={orderStatusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOrderStatusFilter(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search orders by email, name or reference..."
              value={orderSearchQuery}
              onChange={(e) => { setOrderSearchQuery(e.target.value); setOrdersPage(1); }}
              className="pl-10"
            />
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {ordersLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No payment orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Reference</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Plan</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Method</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(filteredOrders, ordersPage, PAGE_SIZE).map((order) => (
                      <tr key={order.id} className={`border-t border-border/50 hover:bg-muted/20 ${order.status === "pending" ? "bg-yellow-500/5" : ""}`}>
                        <td className="py-3 px-4 font-mono text-xs">{order.order_reference || `ORD-${order.id.slice(0, 8)}`}</td>
                        <td className="py-3 px-4 text-sm">
                          <p className="font-medium">{order.user_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{order.user_email || "—"}</p>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <p className="font-medium">{order.program_type?.toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">${Number(order.account_size).toLocaleString()}</p>
                        </td>
                        <td className="py-3 px-4 font-semibold text-primary text-sm">
                          ${Number(order.amount).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-1">
                            {order.payment_method === "wire_transfer" ? (
                              <><Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Wire</>
                            ) : (
                              <><Bitcoin className="w-3.5 h-3.5 text-muted-foreground" /> Crypto</>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {order.status === "pending" ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-500 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          ) : order.status === "approved" ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-500 w-fit flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Approved
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-destructive/10 text-destructive w-fit flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> {order.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {order.status === "pending" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                                disabled={processingId === order.id}
                                onClick={() => handleOrderStatusChange(order.id, "approved")}
                              >
                                {processingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                disabled={processingId === order.id}
                                onClick={() => handleOrderStatusChange(order.id, "rejected")}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                          {order.status !== "pending" && <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <AdminPagination currentPage={ordersPage} totalItems={filteredOrders.length} pageSize={PAGE_SIZE} onPageChange={setOrdersPage} loading={ordersLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFinance;
