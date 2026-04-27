import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AdminPagination, { paginate } from "@/components/admin/AdminPagination";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Trophy,
  DollarSign,
  TrendingUp,
  Shield,
  Settings,
  FileText,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Ban,
  RefreshCw,
  Edit,
  MoreVertical,
  MessageSquare,
  Bell,
  Loader2,
  Globe,
  Ticket,
  FileCheck,
  CreditCard,
  BookOpen,
  GitBranch,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import AdminChatManagement from "@/components/admin/AdminChatManagement";
import AccountProvisioningModal from "@/components/admin/AccountProvisioningModal";
import LoginHistoryTable from "@/components/admin/LoginHistoryTable";
import CouponManagement from "@/components/admin/CouponManagement";
import StrategyReview from "@/components/admin/StrategyReview";
import PaymentOrdersManagement from "@/components/admin/PaymentOrdersManagement";
import FAQManagement from "@/components/admin/FAQManagement";
import ChallengeProgressionManagement from "@/components/admin/ChallengeProgressionManagement";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import AdminSupportTickets from "@/components/admin/AdminSupportTickets";
import AdminContactSubmissions from "@/components/admin/AdminContactSubmissions";
import { Mail } from "lucide-react";
import { useAdminRole } from "@/components/admin/AdminAuthGuard";
import { logAdminAction } from "@/lib/adminLogger";

interface AdminNotification {
  id: string;
  type: "escalation" | "ticket" | "contact";
  title: string;
  message: string;
  timestamp: Date;
  conversationId?: string;
}

type AdminOverviewStats = {
  totalUsers: number;
  activeAccounts: number;
  totalFunded: number;
  pendingPayouts: number;
  totalAUM: number;
  monthlyRevenue: number;
};

type AdminRecentActivity = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  kind: "success" | "info" | "warning";
};

// Types for dynamic data
interface AdminUser {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  account_count: number;
}

interface AdminAccount {
  id: string;
  account_number: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  account_size: number;
  balance: number;
  phase: string | null;
  status: string;
  program_type: string | null;
}

interface AdminPayout {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  amount: number;
  status: string;
  requested_at: string;
}

interface AdminTrade {
  id: string;
  user_id: string;
  user_email?: string;
  account_number?: string;
  symbol: string;
  direction: string;
  lot_size: number;
  pnl: number | null;
  rule_violation: boolean | null;
}

interface AdminTicket {
  id: string;
  user_id: string;
  user_email?: string;
  subject: string;
  status: string;
  priority: string | null;
  created_at: string;
}

interface AdminChallenge {
  id: string;
  challenge_number: string;
  user_id: string;
  user_email?: string;
  account_id: string;
  account_number?: string;
  program_type: string;
  account_size: number;
  phase: string;
  status: string;
}

interface AdminRule {
  id: string;
  program_type: string;
  account_size: number;
  profit_target_phase1: number;
  profit_target_phase2: number | null;
  max_drawdown: number;
  daily_drawdown: number;
  min_trading_days: number;
  profit_split: number | null;
}

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { role: adminRole, loading: roleLoading, isAdmin, isRoot, isModerator, canAccessPage } = useAdminRole();
  const [activeTab, setActiveTab] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState<AdminOverviewStats>({
    totalUsers: 0,
    activeAccounts: 0,
    totalFunded: 0,
    pendingPayouts: 0,
    totalAUM: 0,
    monthlyRevenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<AdminRecentActivity[]>([]);

  // Dynamic data states
  const [usersData, setUsersData] = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalCount, setUsersTotalCount] = useState(0);
  const USERS_PAGE_SIZE = 50;
  const [accountsData, setAccountsData] = useState<AdminAccount[]>([]);
  const [payoutsData, setPayoutsData] = useState<AdminPayout[]>([]);
  const [tradesData, setTradesData] = useState<AdminTrade[]>([]);
  const [ticketsData, setTicketsData] = useState<AdminTicket[]>([]);
  const [challengesData, setChallengesData] = useState<AdminChallenge[]>([]);
  const [rulesData, setRulesData] = useState<AdminRule[]>([]);
  const [loginHistoryUser, setLoginHistoryUser] = useState<{ id: string; email: string } | null>(null);
  const [challengeFilterUser, setChallengeFilterUser] = useState<{ id: string; email: string } | null>(null);
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>("all");
  const [challengeStatusFilter, setChallengeStatusFilter] = useState<string>("all");
  const [tradeDirectionFilter, setTradeDirectionFilter] = useState<string>("all");
  const [tradeViolationFilter, setTradeViolationFilter] = useState<string>("all");
  const [tradeUserFilter, setTradeUserFilter] = useState<string>("all");
  const [tradeUserSearch, setTradeUserSearch] = useState<string>("");
  const [tabLoading, setTabLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  // Pagination states for all tabs
  const [accountsPage, setAccountsPage] = useState(1);
  const [accountsTotalCount, setAccountsTotalCount] = useState(0);
  const [challengesPage, setChallengesPage] = useState(1);
  const [challengesTotalCount, setChallengesTotalCount] = useState(0);
  const [tradesPage, setTradesPage] = useState(1);
  const [tradesTotalCount, setTradesTotalCount] = useState(0);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const ADMIN_PAGE_SIZE = 50;
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Account detail modal state
  const [accountDetailModal, setAccountDetailModal] = useState<{
    open: boolean;
    loading: boolean;
    account: AdminAccount | null;
    challenge: any | null;
    trades: any[];
    payouts: any[];
  }>({ open: false, loading: false, account: null, challenge: null, trades: [], payouts: [] });

  const openAccountDetailModal = async (accountId: string) => {
    setAccountDetailModal({ open: true, loading: true, account: null, challenge: null, trades: [], payouts: [] });
    try {
      const [accRes, chRes, trRes, poRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("id", accountId).single(),
        supabase.from("challenges").select("*").eq("account_id", accountId).order("created_at", { ascending: false }).limit(1),
        supabase.from("trades").select("*").eq("account_id", accountId).order("opened_at", { ascending: false }).limit(10),
        supabase.from("payouts").select("*").eq("account_id", accountId).order("requested_at", { ascending: false }).limit(5),
      ]);
      // Get user email from profiles
      let userEmail = "";
      if (accRes.data?.user_id) {
        const { data: prof } = await supabase.from("profiles").select("email, full_name").eq("user_id", accRes.data.user_id).maybeSingle();
        userEmail = prof?.email || prof?.full_name || "";
      }
      const acc = accRes.data ? { ...accRes.data, user_email: userEmail } as any : null;
      setAccountDetailModal({
        open: true, loading: false,
        account: acc,
        challenge: chRes.data?.[0] || null,
        trades: trRes.data || [],
        payouts: poRes.data || [],
      });
    } catch {
      setAccountDetailModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Account provisioning modal state
  const [provisioningModalOpen, setProvisioningModalOpen] = useState(false);
  const [selectedUserForProvisioning, setSelectedUserForProvisioning] = useState<{
    userId: string;
    userEmail: string;
    userName?: string;
  } | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  // State for pass validation confirmation dialog
  const [passConfirmDialog, setPassConfirmDialog] = useState<{
    open: boolean;
    challengeId: string;
    warnings: string[];
  }>({ open: false, challengeId: "", warnings: [] });

  // State for edit profit dialog
  const [editProfitDialog, setEditProfitDialog] = useState<{
    open: boolean;
    challengeId: string;
    challengeNumber: string;
    currentBalance: number;
    currentProfitAmount: number;
    currentProfitPercent: number;
    accountSize: number;
  } | null>(null);
  const [editProfitValue, setEditProfitValue] = useState("");
  const [editBalanceValue, setEditBalanceValue] = useState("");
  const [savingProfit, setSavingProfit] = useState(false);

  // Admin action handlers
  const handleChallengeAction = async (challengeId: string, action: "pass" | "fail" | "disable", skipValidation = false) => {
    setProcessingId(challengeId);
    try {
      let updateData: { status?: string; phase?: string } = {};
      const challenge = challengesData.find((c) => c.id === challengeId);

      if (action === "pass" && !skipValidation) {
        // Fetch full challenge details for validation
        const { data: fullChallenge } = await supabase
          .from("challenges")
          .select("*")
          .eq("id", challengeId)
          .single();

        if (fullChallenge) {
          // Fetch rules for this program/size
          const { data: ruleData } = await supabase
            .from("rules")
            .select("*")
            .eq("program_type", fullChallenge.program_type)
            .eq("account_size", fullChallenge.account_size)
            .maybeSingle();

          const warnings: string[] = [];

          if (ruleData) {
            const currentPhase = fullChallenge.phase;
            const requiredTarget = currentPhase === "phase2"
              ? (ruleData.profit_target_phase2 ?? ruleData.profit_target_phase1)
              : ruleData.profit_target_phase1;

            // Check profit target
            if (fullChallenge.current_profit_percent < requiredTarget) {
              warnings.push(`Profit target not met: ${fullChallenge.current_profit_percent}% / ${requiredTarget}% required`);
            }

            // Check drawdown breaches
            if (fullChallenge.current_drawdown_percent >= ruleData.max_drawdown) {
              warnings.push(`Max drawdown breached: ${fullChallenge.current_drawdown_percent}% (limit: ${ruleData.max_drawdown}%)`);
            }

            // Check min trading days
            if (fullChallenge.days_traded < ruleData.min_trading_days) {
              warnings.push(`Min trading days not met: ${fullChallenge.days_traded} / ${ruleData.min_trading_days} days required`);
            }
          } else {
            warnings.push(`No rules found for ${fullChallenge.program_type} / $${fullChallenge.account_size}`);
          }

          if (warnings.length > 0) {
            setPassConfirmDialog({ open: true, challengeId, warnings });
            setProcessingId(null);
            return;
          }
        }
      }

      if (action === "pass") {
        if (challenge?.phase === "phase1" && challenge?.program_type === "1-step") {
          // 1-step: phase1 → funded directly
          updateData = { phase: "funded", status: "funded" };
        } else if (challenge?.phase === "phase1") {
          // 2-step / halfway-there: phase1 → phase2
          updateData = { phase: "phase2", status: "active" };
        } else if (challenge?.phase === "phase2") {
          updateData = { phase: "funded", status: "funded" };
        } else {
          updateData = { status: "passed" };
        }
      } else if (action === "fail") {
        updateData = { status: "failed" };
      } else if (action === "disable") {
        updateData = { status: "disabled" };
      }

      const { error } = await supabase.from("challenges").update(updateData).eq("id", challengeId);
      if (error) throw error;

      // Also update the linked account phase/status
      if (challenge) {
        const { data: challengeDetail } = await supabase
          .from("challenges")
          .select("account_id")
          .eq("id", challengeId)
          .single();

        if (challengeDetail?.account_id) {
          if (action === "pass") {
            const accountUpdate: { phase?: string; status?: string } = {};
            let shouldDisableOnCondor = false;
            if (challenge.phase === "phase1" && challenge.program_type === "1-step") {
              accountUpdate.phase = "funded";
              accountUpdate.status = "disabled";
              shouldDisableOnCondor = true;
            } else if (challenge.phase === "phase1") {
              accountUpdate.phase = "phase2";
            } else if (challenge.phase === "phase2") {
              accountUpdate.phase = "funded";
              accountUpdate.status = "disabled";
              shouldDisableOnCondor = true;
            }
            if (Object.keys(accountUpdate).length > 0) {
              await supabase.from("accounts").update(accountUpdate).eq("id", challengeDetail.account_id);
            }
            // Fire-and-forget Condor disable (don't block UI)
            if (shouldDisableOnCondor) {
              console.log(`Disabling on Condor: challengeId=${challengeId}, account_id=${challengeDetail.account_id}`);
              supabase.functions.invoke("manage-condor-account", {
                body: { action: "disable", challengeId: challengeId },
              }).then(({ error: condorError }) => {
                if (condorError) {
                  console.error("Failed to disable account on Condor:", condorError);
                  toast({ title: "Warning", description: "Condor API call failed — account disabled locally only", variant: "destructive" });
                }
              });
            }
          } else if (action === "fail") {
            await supabase.from("accounts").update({ status: "failed" }).eq("id", challengeDetail.account_id);
            // Fire-and-forget Condor disable
            console.log(`Disabling on Condor (fail): challengeId=${challengeId}`);
            supabase.functions.invoke("manage-condor-account", {
              body: { action: "disable", challengeId: challengeId },
            }).then(({ error: condorError }) => {
              if (condorError) {
                console.error("Failed to disable account on Condor:", condorError);
                toast({ title: "Warning", description: "Condor disable API call failed", variant: "destructive" });
              }
            });
          } else if (action === "disable") {
            await supabase.from("accounts").update({ status: "suspended" }).eq("id", challengeDetail.account_id);
            // Fire-and-forget Condor disable
            console.log(`Disabling on Condor (disable): challengeId=${challengeId}`);
            supabase.functions.invoke("manage-condor-account", {
              body: { action: "disable", challengeId: challengeId },
            }).then(({ error: condorError }) => {
              if (condorError) {
                console.error("Failed to disable account on Condor:", condorError);
                toast({ title: "Warning", description: "Condor disable API call failed", variant: "destructive" });
              }
            });
          }
        }
      }

      await logAdminAction(`challenge_${action}`, "challenge", challengeId, {
        challenge_number: challenge?.challenge_number,
        user_id: challenge?.user_id,
        previous_phase: challenge?.phase,
        previous_status: challenge?.status,
        new_status: updateData.status,
        new_phase: updateData.phase,
      });

      let description = "";
      if (action === "pass") {
        if (challenge?.phase === "phase1" && challenge?.program_type === "1-step") {
          description = "Funded! Account disabled — awaiting strategy review";
        } else if (challenge?.phase === "phase1") {
          description = "Moved to Phase 2";
        } else if (challenge?.phase === "phase2") {
          description = "Funded! Account disabled — awaiting strategy review";
        } else description = "Challenge passed";
      } else if (action === "fail") {
        description = "Challenge marked as failed & disabled on Condor";
      } else {
        description = "Challenge disabled on Condor";
      }
      toast({ title: "Success", description });
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error("Error updating challenge:", e);
      toast({ title: "Error", description: "Failed to update challenge", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAccountAction = async (accountId: string, action: "disable" | "enable" | "archive") => {
    setProcessingId(accountId);
    try {
      const statusMap = { disable: "suspended", enable: "active", archive: "archived" };
      let condorWarning: string | null = null;

      // For disable/enable, call Condor API first using the challenge's ID
      if (action === "disable" || action === "enable") {
        // Find the challenge linked to this account to get the challengeId for Condor
        const { data: challengeData } = await supabase
          .from("challenges")
          .select("id")
          .eq("account_id", accountId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (challengeData?.id) {
          console.log(`Calling Condor ${action} for challengeId=${challengeData.id}, account_id=${accountId}`);
          const { data: condorResult, error: condorError } = await supabase.functions.invoke("manage-condor-account", {
            body: { action, challengeId: challengeData.id },
          });

          if (condorError || (condorResult && !condorResult.success)) {
            console.error(`Condor ${action} failed:`, condorError || condorResult);
            condorWarning = `Could not ${action} account on Condor, but local status was updated.`;
          }
        } else {
          console.warn(`No challenge found for account ${accountId} — updating locally only`);
        }
      }

      const { error } = await supabase.from("accounts").update({ status: statusMap[action] }).eq("id", accountId);
      if (error) throw error;

      // Also update the linked challenge status
      if (action === "disable" || action === "enable") {
        const challengeStatus = action === "disable" ? "suspended" : "active";
        const updatableStatuses = action === "enable"
          ? ["active", "suspended", "disabled", "failed", "breached", "expired", "inactive"]
          : ["active", "suspended"];

        await supabase.from("challenges").update({ status: challengeStatus }).eq("account_id", accountId).in("status", updatableStatuses);
      }

      const account = accountsData.find((a) => a.id === accountId);
      await logAdminAction(`account_${action}`, "account", accountId, {
        account_number: account?.account_number,
        user_id: account?.user_id,
        new_status: statusMap[action],
      });

      toast({ title: "Success", description: `Account ${action}d successfully` });
      if (condorWarning) {
        toast({ title: "Warning", description: condorWarning, variant: "destructive" });
      }
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error("Error updating account:", e);
      toast({ title: "Error", description: "Failed to update account", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateAccount = async (userId: string, accountSize: number, programType: string) => {
    try {
      const accountNumber = `PROP-${Date.now().toString().slice(-6)}`;

      const { error: accountError } = await supabase.from("accounts").insert({
        user_id: userId,
        account_number: accountNumber,
        account_type: "prop",
        account_size: accountSize,
        balance: accountSize,
        equity: accountSize,
        status: "active",
        phase: "phase1",
        program_type: programType,
      });

      if (accountError) throw accountError;

      // Also create a challenge for this account
      const challengeNumber = `CH-${Date.now().toString().slice(-8)}`;
      const { data: newAccount } = await supabase
        .from("accounts")
        .select("id")
        .eq("account_number", accountNumber)
        .single();

      if (newAccount) {
        await supabase.from("challenges").insert({
          user_id: userId,
          account_id: newAccount.id,
          challenge_number: challengeNumber,
          program_type: programType,
          account_size: accountSize,
          current_balance: accountSize,
          profit_target_amount: accountSize * 0.08,
          max_drawdown_amount: accountSize * 0.1,
          phase: "phase1",
          status: "active",
        });
      }

      toast({ title: "Success", description: `New account ${accountNumber} created` });
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error("Error creating account:", e);
      toast({ title: "Error", description: "Failed to create account", variant: "destructive" });
    }
  };

  // Subscribe to escalated conversations + new tickets in realtime
  useEffect(() => {
    const handleEscalation = (conv: { id: string; user_email?: string; user_name?: string }) => {
      const newNotif: AdminNotification = {
        id: `conv-${conv.id}-${Date.now()}`,
        type: "escalation",
        title: "🔴 Live Agent Requested",
        message: `${conv.user_name || conv.user_email || "A visitor"} is asking for human support`,
        timestamp: new Date(),
        conversationId: conv.id,
      };
      setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
      toast({
        title: "🔴 Live Agent Requested",
        description: newNotif.message,
        variant: "destructive",
      });
    };

    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const conv = payload.new as { id: string; user_email?: string; user_name?: string; status: string };
          if (conv.status === "escalated") handleEscalation(conv);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        (payload) => {
          const conv = payload.new as { id: string; user_email?: string; user_name?: string; status: string };
          if (conv.status === "escalated") handleEscalation(conv);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tickets" },
        (payload) => {
          const ticket = payload.new as { id: string; subject: string; priority?: string };
          const isUrgent = ticket.priority === "high";
          const newNotif: AdminNotification = {
            id: `ticket-${ticket.id}`,
            type: isUrgent ? "contact" : "ticket",
            title: isUrgent ? "🟠 Urgent: Agent Request" : "New Support Ticket",
            message: ticket.subject,
            timestamp: new Date(),
          };
          setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
          toast({
            title: newNotif.title,
            description: ticket.subject,
            variant: isUrgent ? "destructive" : "default",
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  const handleNotificationClick = (notif: AdminNotification) => {
    if (notif.type === "escalation") {
      setActiveTab("chat");
    } else if (notif.type === "contact") {
      setActiveTab("chat");
    } else {
      setActiveTab("support");
    }
    setShowNotifications(false);
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/prop/login");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/prop/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load admin overview stats (no demo data)
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const loadStats = async () => {
      try {
        const [
          profilesRes,
          activeAccountsRes,
          fundedChallengesRes,
          pendingPayoutsRes,
          fundedBalancesRes,
          monthRevenueRes,
        ] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("accounts").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase
            .from("challenges")
            .select("id", { count: "exact", head: true })
            .eq("phase", "funded")
            .eq("status", "active"),
          supabase.from("payouts").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase
            .from("challenges")
            .select("current_balance")
            .eq("phase", "funded")
            .eq("status", "active")
            .limit(1000),
          (() => {
            const since = new Date();
            since.setDate(since.getDate() - 30);
            return supabase
              .from("payouts")
              .select("amount, processed_at")
              .eq("status", "paid")
              .gte("processed_at", since.toISOString())
              .limit(1000);
          })(),
        ]);

        const totalAUM = (fundedBalancesRes.data || []).reduce(
          (sum, r: any) => sum + Number(r.current_balance || 0),
          0,
        );
        const monthlyRevenue = (monthRevenueRes.data || []).reduce((sum, r: any) => sum + Number(r.amount || 0), 0);

        if (!mounted) return;

        setStats({
          totalUsers: profilesRes.count ?? 0,
          activeAccounts: activeAccountsRes.count ?? 0,
          totalFunded: fundedChallengesRes.count ?? 0,
          pendingPayouts: pendingPayoutsRes.count ?? 0,
          totalAUM,
          monthlyRevenue,
        });
      } catch (e) {
        console.error("Failed to load admin stats", e);
      }
    };

    const loadRecentActivity = async () => {
      try {
        const { data, error } = await supabase
          .from("admin_logs")
          .select("id, action, target_type, created_at")
          .order("created_at", { ascending: false })
          .limit(6);

        if (error) throw error;

        const mapped: AdminRecentActivity[] = (data || []).map((row: any) => {
          const action = String(row.action || "activity");
          const target = String(row.target_type || "system");
          return {
            id: row.id,
            title: action,
            description: target,
            createdAt: row.created_at,
            kind: "info",
          };
        });

        if (!mounted) return;
        setRecentActivity(mapped);
      } catch (e) {
        if (!mounted) return;
        setRecentActivity([]);
      }
    };

    loadStats();
    loadRecentActivity();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Load tab-specific data when switching tabs
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadTabData = async () => {
      setTabLoading(true);
      try {
        switch (activeTab) {
          case "users":
            await loadUsers(usersPage);
            break;
          case "accounts":
            await loadAccounts();
            break;
          case "payouts":
            await loadPayouts();
            break;
          case "trades":
            await loadTrades();
            break;
          case "support":
            await loadTickets();
            break;
          case "challenges":
            await loadChallenges();
            break;
          case "rules":
            await loadRules();
            break;
        }
      } catch (e) {
        console.error("Failed to load tab data", e);
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    };

    loadTabData();
    return () => { cancelled = true; };
  }, [activeTab, user, usersPage, accountsPage, accountStatusFilter, challengesPage, challengeStatusFilter, challengeFilterUser, tradesPage, tradeDirectionFilter, tradeViolationFilter, tradeUserFilter, refreshTrigger]);

  // Re-search users when searchQuery changes (debounced via user clicking or typing)
  useEffect(() => {
    if (activeTab !== "users" || !user) return;
    const timeout = setTimeout(() => {
      setUsersPage(1);
      setTabLoading(true);
      loadUsers(1).finally(() => setTabLoading(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    if (activeTab !== "accounts" && activeTab !== "challenges") return;

    const timeout = setTimeout(() => {
      if (activeTab === "accounts") setAccountsPage(1);
      if (activeTab === "challenges") setChallengesPage(1);
      setRefreshTrigger((t) => t + 1);
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchQuery, activeTab, user]);

  const loadUsers = async (page = 1) => {
    const from = (page - 1) * USERS_PAGE_SIZE;
    const to = from + USERS_PAGE_SIZE - 1;

    // If there's a search query, do a server-side filtered query
    let query = supabase
      .from("profiles")
      .select("id, user_id, email, full_name, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    if (searchQuery) {
      const q = `%${searchQuery}%`;
      query = query.or(`email.ilike.${q},full_name.ilike.${q}`);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    setUsersTotalCount(count ?? 0);

    // Get account counts for this page's users
    const userIds = (data || []).map((p) => p.user_id);
    let accountCounts: any[] = [];
    if (userIds.length > 0) {
      const { data: ac } = await supabase.from("accounts").select("user_id").in("user_id", userIds);
      accountCounts = ac || [];
    }

    const countMap = accountCounts.reduce((acc: Record<string, number>, row) => {
      acc[row.user_id] = (acc[row.user_id] || 0) + 1;
      return acc;
    }, {});

    setUsersData(
      (data || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        email: p.email,
        full_name: p.full_name,
        created_at: p.created_at,
        account_count: countMap[p.user_id] || 0,
      })),
    );
  };

  // Helper to batch .in() queries (avoids PostgREST URL length limits)
  const batchFetchProfiles = async (userIds: string[]) => {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map<string, { email: string | null; full_name: string | null }>();
    const CHUNK = 100;
    const allProfiles: { user_id: string; email: string | null; full_name: string | null }[] = [];
    for (let i = 0; i < unique.length; i += CHUNK) {
      const { data } = await supabase.from("profiles").select("user_id, email, full_name").in("user_id", unique.slice(i, i + CHUNK));
      if (data) allProfiles.push(...data);
    }
    return new Map(allProfiles.map((p) => [p.user_id, { email: p.email, full_name: p.full_name }]));
  };

  const batchFetchAccounts = async (accountIds: string[]) => {
    const unique = [...new Set(accountIds)];
    if (unique.length === 0) return new Map<string, string>();
    const CHUNK = 100;
    const all: { id: string; account_number: string }[] = [];
    for (let i = 0; i < unique.length; i += CHUNK) {
      const { data } = await supabase.from("accounts").select("id, account_number").in("id", unique.slice(i, i + CHUNK));
      if (data) all.push(...data);
    }
    return new Map(all.map((a) => [a.id, a.account_number]));
  };

  const findMatchingUserIds = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return [] as string[];

    const q = `%${term}%`;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id")
      .or(`email.ilike.${q},full_name.ilike.${q}`)
      .limit(200);

    if (error) throw error;
    return [...new Set((data || []).map((row) => row.user_id).filter(Boolean))];
  };

  const loadAccounts = async () => {
    const from = (accountsPage - 1) * ADMIN_PAGE_SIZE;
    const to = from + ADMIN_PAGE_SIZE - 1;
    const trimmedSearch = searchQuery.trim();

    let query = supabase
      .from("accounts")
      .select("id, account_number, user_id, account_size, balance, phase, status, program_type", { count: "exact" })
      .order("created_at", { ascending: false });

    if (accountStatusFilter !== "all") {
      if (accountStatusFilter === "suspended") {
        query = query.in("status", ["suspended", "disabled", "failed", "breached", "expired", "inactive"]);
      } else {
        query = query.eq("status", accountStatusFilter);
      }
    }

    if (trimmedSearch) {
      const matchingUserIds = await findMatchingUserIds(trimmedSearch);
      const q = `%${trimmedSearch}%`;
      const orClauses = [`account_number.ilike.${q}`, `program_type.ilike.${q}`];

      if (matchingUserIds.length > 0) {
        orClauses.push(`user_id.in.(${matchingUserIds.join(",")})`);
      }

      query = query.or(orClauses.join(","));
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    setAccountsTotalCount(count ?? 0);

    const userIds = (data || []).map((a) => a.user_id);
    const profileMap = await batchFetchProfiles(userIds);

    setAccountsData(
      (data || []).map((a) => ({
        ...a,
        user_email: profileMap.get(a.user_id)?.email || undefined,
        user_name: profileMap.get(a.user_id)?.full_name || undefined,
      })),
    );
  };

  const loadPayouts = async () => {
    const { data, error } = await supabase
      .from("payouts")
      .select("id, user_id, amount, status, requested_at")
      .order("requested_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const userIds = (data || []).map((p) => p.user_id);
    const profileMap = await batchFetchProfiles(userIds);

    setPayoutsData(
      (data || []).map((p) => ({
        ...p,
        user_email: profileMap.get(p.user_id)?.email || undefined,
        user_name: profileMap.get(p.user_id)?.full_name || undefined,
      })),
    );
  };

  const searchTradeUser = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setTradeUserFilter("all");
      return;
    }
    const q = `%${searchTerm}%`;
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .or(`email.ilike.${q},full_name.ilike.${q}`)
      .limit(50);
    if (!data || data.length === 0) {
      setTradeUserFilter("no_match");
      return;
    }
    // If single match, filter by that user; if multiple, filter by first (or use .in)
    // For server-side, we'll set the first matched user_id
    if (data.length === 1) {
      setTradeUserFilter(data[0].user_id);
    } else {
      // Store all matched user_ids as comma-separated for multi-filter
      setTradeUserFilter(data.map(d => d.user_id).join(","));
    }
  };

  const loadTrades = async () => {
    const from = (tradesPage - 1) * ADMIN_PAGE_SIZE;
    const to = from + ADMIN_PAGE_SIZE - 1;

    let query = supabase
      .from("trades")
      .select("id, user_id, account_id, symbol, direction, lot_size, pnl, rule_violation", { count: "exact" })
      .order("created_at", { ascending: false });

    if (tradeDirectionFilter !== "all") {
      query = query.ilike("direction", tradeDirectionFilter);
    }
    if (tradeViolationFilter === "violations") {
      query = query.eq("rule_violation", true);
    } else if (tradeViolationFilter === "clean") {
      query = query.or("rule_violation.eq.false,rule_violation.is.null");
    }
    if (tradeUserFilter !== "all" && tradeUserFilter !== "no_match") {
      const userIds = tradeUserFilter.split(",");
      if (userIds.length === 1) {
        query = query.eq("user_id", tradeUserFilter);
      } else {
        query = query.in("user_id", userIds);
      }
    }
    if (tradeUserFilter === "no_match") {
      // No matching users found — return empty
      setTradesData([]);
      setTradesTotalCount(0);
      return;
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    setTradesTotalCount(count ?? 0);

    const userIds = (data || []).map((t) => t.user_id);
    const accountIds = (data || []).map((t) => t.account_id);

    const [profileMap, accountMap] = await Promise.all([
      batchFetchProfiles(userIds),
      batchFetchAccounts(accountIds),
    ]);

    setTradesData(
      (data || []).map((t) => ({
        ...t,
        user_email: profileMap.get(t.user_id)?.email || profileMap.get(t.user_id)?.full_name || undefined,
        account_number: accountMap.get(t.account_id) || undefined,
      })),
    );
  };

  const loadTickets = async () => {
    const { data, error } = await supabase
      .from("tickets")
      .select("id, user_id, subject, status, priority, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const userIds = (data || []).map((t) => t.user_id);
    const profileMap = await batchFetchProfiles(userIds);

    setTicketsData(
      (data || []).map((t) => ({
        ...t,
        user_email: profileMap.get(t.user_id)?.email || undefined,
      })),
    );
  };

  const loadChallenges = async () => {
    const from = (challengesPage - 1) * ADMIN_PAGE_SIZE;
    const to = from + ADMIN_PAGE_SIZE - 1;
    const trimmedSearch = searchQuery.trim();

    let query = supabase
      .from("challenges")
      .select("id, challenge_number, user_id, account_id, program_type, account_size, phase, status", { count: "exact" })
      .order("created_at", { ascending: false });

    if (challengeStatusFilter !== "all") {
      if (challengeStatusFilter === "failed") {
        query = query.in("status", ["failed", "breached"]);
      } else {
        query = query.eq("status", challengeStatusFilter);
      }
    }
    if (challengeFilterUser) {
      query = query.eq("user_id", challengeFilterUser.id);
    }

    if (trimmedSearch) {
      const matchingUserIds = await findMatchingUserIds(trimmedSearch);
      const q = `%${trimmedSearch}%`;
      const orClauses = [`challenge_number.ilike.${q}`, `program_type.ilike.${q}`];

      if (matchingUserIds.length > 0) {
        orClauses.push(`user_id.in.(${matchingUserIds.join(",")})`);
      }

      query = query.or(orClauses.join(","));
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    setChallengesTotalCount(count ?? 0);

    const userIds = (data || []).map((c) => c.user_id);
    const accountIds = (data || []).map((c) => c.account_id);

    const [profileMap, accountMap] = await Promise.all([
      batchFetchProfiles(userIds),
      batchFetchAccounts(accountIds),
    ]);

    setChallengesData(
      (data || []).map((c) => ({
        ...c,
        user_email: profileMap.get(c.user_id)?.email || profileMap.get(c.user_id)?.full_name || undefined,
        account_number: accountMap.get(c.account_id) || undefined,
      })),
    );
  };

  const loadRules = async () => {
    const { data, error } = await supabase
      .from("rules")
      .select(
        "id, program_type, account_size, profit_target_phase1, profit_target_phase2, max_drawdown, daily_drawdown, min_trading_days, profit_split",
      )
      .order("program_type", { ascending: true });

    if (error) throw error;
    setRulesData(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out", description: "See you next time!" });
    navigate("/prop/login");
  };

  const allMenuItems = [
    { icon: LayoutDashboard, label: "Overview", tab: "overview" },
    { icon: Users, label: "Users", tab: "users" },
    { icon: Wallet, label: "Accounts", tab: "accounts" },
    { icon: Trophy, label: "Challenges", tab: "challenges" },
    { icon: FileCheck, label: "Strategy Reviews", tab: "strategies" },
    { icon: CreditCard, label: "Payment Orders", tab: "payments" },
    { icon: DollarSign, label: "Finance", tab: "finance", link: "/roots/finance" },
    { icon: Shield, label: "Compliance", tab: "compliance", link: "/roots/compliance" },
    { icon: TrendingUp, label: "Trades Monitor", tab: "trades" },
    { icon: Globe, label: "Login History", tab: "logins" },
    { icon: Ticket, label: "Coupons", tab: "coupons" },
    { icon: BookOpen, label: "FAQ Manager", tab: "faq" },
    { icon: FileText, label: "Data Import", tab: "import", link: "/roots/import" },
    { icon: MessageSquare, label: "Live Chat", tab: "chat" },
    { icon: HelpCircle, label: "Support", tab: "support" },
    { icon: Mail, label: "Contact Inbox", tab: "contact" },
    { icon: Settings, label: "Settings", tab: "settings" },
    { icon: GitBranch, label: "Progression", tab: "progression" },
  ];

  // Filter menu by page permissions — admins with no explicit permissions get full access
  const menuItems = allMenuItems.filter((item) => canAccessPage(item.tab));

  // Set default tab based on first accessible page
  useEffect(() => {
    if (adminRole && !activeTab && menuItems.length > 0) {
      setActiveTab(menuItems[0].tab);
    }
  }, [adminRole, activeTab, menuItems.length]);

  // Helper functions
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadge = (status: string, type: "user" | "account" | "payout" | "ticket" | "challenge") => {
    const statusLower = status?.toLowerCase() || "";
    
    // For phase display, use consistent phase colors
    if (type === "account" || type === "challenge") {
      if (statusLower === "phase1" || statusLower === "evaluation") {
        return <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-500">Phase 1</span>;
      }
      if (statusLower === "phase2") {
        return <span className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-500">Phase 2</span>;
      }
      if (statusLower === "funded") {
        return <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-500">Funded</span>;
      }
    }

    const isPositive = ["active", "paid", "resolved", "passed"].includes(statusLower);
    const isNeutral = ["pending", "in_progress"].includes(statusLower);
    const isNegative = ["suspended", "failed", "rejected", "closed", "disabled", "expired"].includes(statusLower);

    return (
      <span
        className={`text-xs px-2 py-1 rounded ${
          isPositive
            ? "bg-primary/10 text-primary"
            : isNeutral
              ? "bg-accent/50 text-accent-foreground"
              : isNegative
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
        }`}
      >
        {status?.replace("_", " ") || "N/A"}
      </span>
    );
  };

  const renderEmptyState = (message: string) => (
    <tr>
      <td colSpan={10} className="py-12 text-center text-muted-foreground">
        {message}
      </td>
    </tr>
  );

  const renderLoadingState = () => (
    <tr>
      <td colSpan={10} className="py-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
      </td>
    </tr>
  );

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-20"} bg-secondary/50 border-r border-border/20 transition-all duration-300 flex flex-col`}
      >
        <div className="p-6 border-b border-border/20">
          <Link to="/prop" className="flex items-center gap-2">
            {sidebarOpen ? (
              <span className="text-xl font-heading font-bold">
                <span className="text-foreground">KUBERA</span> <span className="text-primary">ADMIN</span>
              </span>
            ) : (
              <span className="text-xl font-heading font-bold text-primary">KA</span>
            )}
          </Link>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item, index) => (
              <li key={index}>
                {item.link ? (
                  <Link
                    to={item.link}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  >
                    <item.icon className="w-5 h-5" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                ) : (
                  <button
                    onClick={() => { setActiveTab(item.tab); setSearchQuery(""); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === item.tab
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-border/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
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
            <h1 className="text-xl font-heading font-bold capitalize">{activeTab}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === "users" ? "Search users by email, name..." :
                  activeTab === "trades" ? "Search trades by user, account, symbol..." :
                  activeTab === "accounts" ? "Search by account #, user..." :
                  activeTab === "challenges" ? "Search challenges..." :
                  "Search..."
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Auto-switch to Users tab if searching from a non-filterable tab
                  const filterableTabs = ["users", "trades", "accounts", "challenges"];
                  if (e.target.value && !filterableTabs.includes(activeTab)) {
                    setActiveTab("users");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();

                  const query = e.currentTarget.value.trim();
                  if (!query) return;

                  const filterableTabs = ["users", "trades", "accounts", "challenges"];
                  if (!filterableTabs.includes(activeTab)) {
                    setActiveTab("users");
                    return;
                  }

                  // Explicitly reload current tab data on Enter
                  void (async () => {
                    setTabLoading(true);
                    try {
                      setRefreshTrigger((t) => t + 1);
                    } catch (err) {
                      console.error("Header search reload failed:", err);
                    } finally {
                      setTabLoading(false);
                    }
                  })();
                }}
                className="pl-10 w-64"
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-muted rounded-lg relative"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                    <span className="font-semibold">Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">No new notifications</div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className="w-full text-left p-3 hover:bg-muted/50 border-b border-border/50 last:border-0"
                        >
                          <div className="flex items-start gap-2">
                            {notif.type === "escalation" ? (
                              <MessageSquare className="w-4 h-4 text-primary mt-0.5" />
                            ) : (
                              <HelpCircle className="w-4 h-4 text-accent mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{notif.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notif.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Wallet className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">{stats.activeAccounts.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Active Accounts</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Trophy className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">{stats.totalFunded}</p>
                  <p className="text-sm text-muted-foreground">Funded Accounts</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">{stats.pendingPayouts}</p>
                  <p className="text-sm text-muted-foreground">Pending Payouts</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">${(stats.totalAUM / 1000000).toFixed(2)}M</p>
                  <p className="text-sm text-muted-foreground">Total AUM</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-primary">${stats.monthlyRevenue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-heading font-bold mb-4">Recent Activity</h3>
                {recentActivity.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">No admin activity yet.</div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          {item.kind === "success" ? (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          ) : item.kind === "warning" ? (
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                          ) : (
                            <TrendingUp className="w-5 h-5 text-primary" />
                          )}
                          <span className="truncate">
                            {item.title}
                            {item.description ? `: ${item.description}` : ""}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-heading font-bold">
                  All Users <span className="text-sm font-normal text-muted-foreground">({usersTotalCount})</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Accounts</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Join Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabLoading ? renderLoadingState() : usersData.length === 0 ? renderEmptyState("No users found") : usersData.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-4 px-4">{u.email || "—"}</td>
                        <td className="py-4 px-4 font-semibold">{u.full_name || "—"}</td>
                        <td className="py-4 px-4">{u.account_count}</td>
                        <td className="py-4 px-4 text-muted-foreground">{formatDate(u.created_at)}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary/30 hover:bg-primary/10"
                              onClick={() => {
                                setSelectedUserForProvisioning({
                                  userId: u.user_id,
                                  userEmail: u.email || "",
                                  userName: u.full_name || undefined,
                                });
                                setProvisioningModalOpen(true);
                              }}
                              title="Issue a new prop trading account to this user"
                            >
                              Issue Account
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-muted-foreground"
                              onClick={() => {
                                setChallengeFilterUser({ id: u.user_id, email: u.email || "" });
                                setActiveTab("challenges");
                              }}
                              title="View this user's challenges"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Challenges
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => {
                                setLoginHistoryUser({ id: u.user_id, email: u.email || "" });
                                setActiveTab("logins");
                              }}
                              title="View login history for this user"
                            >
                              Login History
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              {usersTotalCount > USERS_PAGE_SIZE && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {((usersPage - 1) * USERS_PAGE_SIZE) + 1}–{Math.min(usersPage * USERS_PAGE_SIZE, usersTotalCount)} of {usersTotalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={usersPage <= 1 || tabLoading}
                      onClick={() => setUsersPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {usersPage} of {Math.ceil(usersTotalCount / USERS_PAGE_SIZE)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={usersPage >= Math.ceil(usersTotalCount / USERS_PAGE_SIZE) || tabLoading}
                      onClick={() => setUsersPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accounts Tab */}
          {activeTab === "accounts" && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-heading font-bold">All Accounts</h3>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-center mb-6">
                <div className="flex gap-2">
                  {["all", "active", "suspended", "archived"].map((status) => (
                    <Button
                      key={status}
                      variant={accountStatusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setAccountStatusFilter(status); setAccountsPage(1); }}
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
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Account ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Size</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Balance</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Phase</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabLoading
                      ? renderLoadingState()
                      : accountsData.length === 0
                        ? renderEmptyState("No accounts found")
                        : accountsData.map((acc) => {
                            const normalizedAccountStatus = (acc.status || "").trim().toLowerCase();
                            const canDisableAccount = normalizedAccountStatus === "active";
                            const canEnableAccount = ["suspended", "disabled", "failed", "breached", "expired", "inactive"].includes(normalizedAccountStatus);

                            return (
                            <tr key={acc.id} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="py-4 px-4 font-mono text-sm">{acc.account_number}</td>
                              <td className="py-4 px-4">{acc.user_name || acc.user_email || "—"}</td>
                              <td className="py-4 px-4">${Number(acc.account_size).toLocaleString()}</td>
                              <td className="py-4 px-4 font-semibold">${Number(acc.balance).toLocaleString()}</td>
                              <td className="py-4 px-4">{getStatusBadge(acc.phase || "—", "account")}</td>
                              <td className="py-4 px-4">{getStatusBadge(acc.status, "account")}</td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <Button variant="ghost" size="sm" title="View Details" onClick={() => openAccountDetailModal(acc.id)}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {canDisableAccount ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() => handleAccountAction(acc.id, "disable")}
                                      disabled={processingId === acc.id}
                                      title="Disable Account"
                                    >
                                      {processingId === acc.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Ban className="w-4 h-4" />
                                      )}
                                    </Button>
                                  ) : canEnableAccount ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-primary"
                                      onClick={() => handleAccountAction(acc.id, "enable")}
                                      disabled={processingId === acc.id}
                                      title="Enable Account"
                                    >
                                      {processingId === acc.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-4 h-4" />
                                      )}
                                    </Button>
                                  ) : null}
                                  {acc.status !== "archived" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAccountAction(acc.id, "archive")}
                                      disabled={processingId === acc.id}
                                      title="Archive Account"
                                      className="text-muted-foreground text-xs"
                                    >
                                      Archive
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                  </tbody>
                </table>
              </div>
              <AdminPagination currentPage={accountsPage} totalItems={accountsTotalCount} pageSize={ADMIN_PAGE_SIZE} onPageChange={setAccountsPage} loading={tabLoading} />
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === "payouts" && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-heading font-bold">Payout Requests</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Request Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabLoading
                      ? renderLoadingState()
                      : payoutsData.length === 0
                        ? renderEmptyState("No payout requests")
                        : payoutsData.map((payout) => (
                            <tr key={payout.id} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="py-4 px-4 font-mono text-sm">{payout.id.slice(0, 8)}</td>
                              <td className="py-4 px-4">{payout.user_name || payout.user_email || "—"}</td>
                              <td className="py-4 px-4 font-semibold text-primary">
                                ${Number(payout.amount).toLocaleString()}
                              </td>
                              <td className="py-4 px-4">{getStatusBadge(payout.status, "payout")}</td>
                              <td className="py-4 px-4 text-muted-foreground">{formatDate(payout.requested_at)}</td>
                              <td className="py-4 px-4">
                                {payout.status === "pending" && (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-primary border-primary hover:bg-primary/10"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive border-destructive hover:bg-destructive/10"
                                    >
                                      <XCircle className="w-4 h-4 mr-1" /> Reject
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trades Monitor Tab */}
          {activeTab === "trades" && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-heading font-bold">Trades Monitor</h3>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-center mb-6">
                {/* User search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user email or name..."
                    value={tradeUserSearch}
                    onChange={(e) => {
                      setTradeUserSearch(e.target.value);
                      if (!e.target.value.trim()) {
                        setTradeUserFilter("all");
                        setTradesPage(1);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setTradesPage(1);
                        searchTradeUser(tradeUserSearch);
                      }
                    }}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setTradesPage(1); searchTradeUser(tradeUserSearch); }}
                >
                  Search
                </Button>
                <div className="flex gap-2">
                  {["all", "buy", "sell"].map((dir) => (
                    <Button
                      key={dir}
                      variant={tradeDirectionFilter === dir ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setTradeDirectionFilter(dir); setTradesPage(1); }}
                      className="capitalize"
                    >
                      {dir}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {[
                    { key: "all", label: "All" },
                    { key: "violations", label: "Violations Only" },
                    { key: "clean", label: "Clean Only" },
                  ].map((opt) => (
                    <Button
                      key={opt.key}
                      variant={tradeViolationFilter === opt.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setTradeViolationFilter(opt.key); setTradesPage(1); }}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Account</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Symbol</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Direction</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Lot Size</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">P&L</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Violation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabLoading
                      ? renderLoadingState()
                      : tradesData.length === 0
                        ? renderEmptyState("No trades found")
                        : tradesData.map((trade) => (
                            <tr
                              key={trade.id}
                              className={`border-b border-border/50 hover:bg-muted/20 ${trade.rule_violation ? "bg-destructive/5" : ""}`}
                            >
                              <td className="py-4 px-4">{trade.user_email || "—"}</td>
                              <td className="py-4 px-4 font-mono text-sm">{trade.account_number || "—"}</td>
                              <td className="py-4 px-4 font-semibold">{trade.symbol}</td>
                              <td className="py-4 px-4">
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    trade.direction === "BUY" || trade.direction === "buy"
                                      ? "bg-primary/10 text-primary"
                                      : "bg-destructive/10 text-destructive"
                                  }`}
                                >
                                  {trade.direction}
                                </span>
                              </td>
                              <td className="py-4 px-4">{Number(trade.lot_size).toFixed(2)}</td>
                              <td
                                className={`py-4 px-4 font-semibold ${(trade.pnl || 0) >= 0 ? "text-primary" : "text-destructive"}`}
                              >
                                {(trade.pnl || 0) >= 0 ? "+" : ""}${Number(trade.pnl || 0).toFixed(2)}
                              </td>
                              <td className="py-4 px-4">
                                {trade.rule_violation ? (
                                  <span className="flex items-center gap-1 text-destructive">
                                    <AlertTriangle className="w-4 h-4" /> Yes
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-primary">
                                    <CheckCircle className="w-4 h-4" /> No
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                  </tbody>
                </table>
              </div>
              <AdminPagination currentPage={tradesPage} totalItems={tradesTotalCount} pageSize={ADMIN_PAGE_SIZE} onPageChange={setTradesPage} loading={tabLoading} />
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === "rules" && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-heading font-bold">Trading Rules Configuration</h3>
                <Button className="bg-primary hover:bg-primary/90">
                  <Edit className="w-4 h-4 mr-2" /> Edit Rules
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Program</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Account Size</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Profit Target P1
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Profit Target P2
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Max DD</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Daily DD</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Min Days</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Profit Split</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabLoading
                      ? renderLoadingState()
                      : rulesData.length === 0
                        ? renderEmptyState("No rules configured")
                        : rulesData.map((rule) => (
                            <tr key={rule.id} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="py-4 px-4 font-semibold">{rule.program_type}</td>
                              <td className="py-4 px-4">${Number(rule.account_size).toLocaleString()}</td>
                              <td className="py-4 px-4">{rule.profit_target_phase1}%</td>
                              <td className="py-4 px-4">
                                {rule.profit_target_phase2 ? `${rule.profit_target_phase2}%` : "N/A"}
                              </td>
                              <td className="py-4 px-4">{rule.max_drawdown}%</td>
                              <td className="py-4 px-4">{rule.daily_drawdown}%</td>
                              <td className="py-4 px-4">{rule.min_trading_days}</td>
                              <td className="py-4 px-4">{rule.profit_split}%</td>
                            </tr>
                          ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Live Chat Tab */}
          {activeTab === "chat" && <AdminChatManagement />}

          {/* Support Tab */}
          {activeTab === "support" && (
            <AdminSupportTickets
              ticketsData={ticketsData}
              tabLoading={tabLoading}
              loadTickets={loadTickets}
              user={user}
              usersData={usersData}
              renderLoadingState={renderLoadingState}
              renderEmptyState={renderEmptyState}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
              toast={toast}
            />
          )}

          {/* Contact Inbox Tab */}
          {activeTab === "contact" && (
            <AdminContactSubmissions
              user={user}
              renderLoadingState={renderLoadingState}
              renderEmptyState={renderEmptyState}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
              toast={toast}
            />
          )}


          {activeTab === "challenges" && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-heading font-bold">
                    {challengeFilterUser ? `Challenges for ${challengeFilterUser.email}` : "All Challenges"}
                  </h3>
                  {challengeFilterUser && (
                    <p className="text-sm text-muted-foreground">
                      Filtered by user — <button className="text-primary underline" onClick={() => setChallengeFilterUser(null)}>Show all</button>
                    </p>
                  )}
                </div>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-center mb-6">
                <div className="flex gap-2">
                  {["all", "active", "passed", "failed", "funded"].map((status) => (
                    <Button
                      key={status}
                      variant={challengeStatusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setChallengeStatusFilter(status); setChallengesPage(1); }}
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
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Challenge ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Account</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Program</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Size</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Phase</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabLoading
                      ? renderLoadingState()
                      : challengesData.length === 0
                        ? renderEmptyState("No challenges found")
                        : challengesData.map((ch) => {
                            const normalizedChallengeStatus = (ch.status || "").trim().toLowerCase();
                            const canRunChallengeActions = normalizedChallengeStatus === "active";
                            const canEnableChallenge = ["disabled", "suspended", "failed", "breached", "expired", "inactive"].includes(normalizedChallengeStatus);

                            return (
                            <tr key={ch.id} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="py-4 px-4 font-mono text-sm">{ch.challenge_number}</td>
                              <td className="py-4 px-4">{ch.user_email || "—"}</td>
                              <td className="py-4 px-4">
                                <button onClick={() => openAccountDetailModal(ch.account_id)} className="text-primary hover:underline font-mono text-sm bg-transparent border-none cursor-pointer p-0">
                                  {ch.account_number || ch.account_id.slice(0, 8)}
                                </button>
                              </td>
                              <td className="py-4 px-4">{ch.program_type}</td>
                              <td className="py-4 px-4">${Number(ch.account_size).toLocaleString()}</td>
                              <td className="py-4 px-4">{getStatusBadge(ch.phase, "challenge")}</td>
                              <td className="py-4 px-4">{getStatusBadge(ch.status, "challenge")}</td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {canRunChallengeActions && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-primary border-primary hover:bg-primary/10"
                                        onClick={() => handleChallengeAction(ch.id, "pass")}
                                        disabled={processingId === ch.id}
                                      >
                                        {processingId === ch.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                        )}
                                         Pass
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive border-destructive hover:bg-destructive/10"
                                        onClick={() => handleChallengeAction(ch.id, "fail")}
                                        disabled={processingId === ch.id}
                                      >
                                        {processingId === ch.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <XCircle className="w-3 h-3 mr-1" />
                                        )}
                                        Fail
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-muted-foreground"
                                        onClick={() => handleChallengeAction(ch.id, "disable")}
                                        disabled={processingId === ch.id}
                                      >
                                        <Ban className="w-3 h-3 mr-1" />
                                        Disable
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      const { data } = await supabase
                                        .from("challenges")
                                        .select("current_balance, current_profit_amount, current_profit_percent, account_size")
                                        .eq("id", ch.id)
                                        .single();
                                      if (data) {
                                        setEditProfitDialog({
                                          open: true,
                                          challengeId: ch.id,
                                          challengeNumber: ch.challenge_number,
                                          currentBalance: Number(data.current_balance),
                                          currentProfitAmount: Number(data.current_profit_amount),
                                          currentProfitPercent: Number(data.current_profit_percent),
                                          accountSize: Number(data.account_size),
                                        });
                                        setEditProfitValue(String(data.current_profit_amount));
                                        setEditBalanceValue(String(data.current_balance));
                                      }
                                    }}
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Edit Profit
                                  </Button>
                                  {canEnableChallenge && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-primary border-primary hover:bg-primary/10"
                                      onClick={() => handleAccountAction(ch.account_id, "enable")}
                                      disabled={processingId === ch.id || processingId === ch.account_id}
                                    >
                                      {processingId === ch.account_id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                      )}
                                      Enable
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                  </tbody>
                </table>
              </div>
              <AdminPagination currentPage={challengesPage} totalItems={challengesTotalCount} pageSize={ADMIN_PAGE_SIZE} onPageChange={setChallengesPage} loading={tabLoading} />
            </div>
          )}

          {/* Login History Tab */}
          {activeTab === "logins" && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-heading font-bold">Login History</h3>
                  <p className="text-sm text-muted-foreground">
                    {loginHistoryUser
                      ? <>Showing logins for <span className="text-foreground font-medium">{loginHistoryUser.email}</span> — <button className="text-primary underline" onClick={() => setLoginHistoryUser(null)}>Show all</button></>
                      : "Track user login activity, IP addresses, devices and browsers"
                    }
                  </p>
                </div>
              </div>
              <LoginHistoryTable
                filterByUserId={loginHistoryUser?.id}
                showUserColumn={!loginHistoryUser}
              />
            </div>
          )}

          {/* Coupons Tab */}
          {activeTab === "coupons" && (
            <div className="bg-card border border-border rounded-xl p-6">
              <CouponManagement />
            </div>
          )}

          {/* FAQ Management Tab */}
          {activeTab === "faq" && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-heading font-bold mb-4">FAQ Management</h2>
              <FAQManagement />
            </div>
          )}

          {/* Strategies Tab */}
          {activeTab === "strategies" && (
            <div className="bg-card border border-border rounded-xl p-6">
              <StrategyReview />
            </div>
          )}

          {/* Payment Orders Tab */}
          {activeTab === "payments" && (
            <div className="bg-card border border-border rounded-xl p-6">
              <PaymentOrdersManagement />
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <AdminUserManagement />

              {/* Platform Settings */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-heading font-bold mb-4">Platform Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Profit Split</label>
                    <Input defaultValue="80" className="w-full" disabled />
                    <p className="text-xs text-muted-foreground">Percentage of profits paid to traders</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Accounts per User</label>
                    <Input defaultValue="5" className="w-full" disabled />
                    <p className="text-xs text-muted-foreground">Maximum number of active accounts</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payout Processing Days</label>
                    <Input defaultValue="3-5 business days" className="w-full" disabled />
                    <p className="text-xs text-muted-foreground">Typical payout processing time</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Support Email</label>
                    <Input defaultValue="support@kuberamarkets.com" className="w-full" disabled />
                    <p className="text-xs text-muted-foreground">Primary support contact</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progression Tab */}
          {activeTab === "progression" && <ChallengeProgressionManagement />}
        </div>
      </main>

      {/* Account Provisioning Modal */}
      {selectedUserForProvisioning && (
        <AccountProvisioningModal
          open={provisioningModalOpen}
          onOpenChange={setProvisioningModalOpen}
          userId={selectedUserForProvisioning.userId}
          userEmail={selectedUserForProvisioning.userEmail}
          userName={selectedUserForProvisioning.userName}
          onSuccess={() => {
            setRefreshTrigger((t) => t + 1);
          }}
        />
      )}

      {/* Pass Validation Confirmation Dialog */}
      <Dialog open={passConfirmDialog.open} onOpenChange={(open) => !open && setPassConfirmDialog({ open: false, challengeId: "", warnings: [] })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Validation Warnings
            </DialogTitle>
            <DialogDescription>
              The following checks did not pass. You can override and pass anyway.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {passConfirmDialog.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPassConfirmDialog({ open: false, challengeId: "", warnings: [] })}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  const cId = passConfirmDialog.challengeId;
                  setPassConfirmDialog({ open: false, challengeId: "", warnings: [] });
                  handleChallengeAction(cId, "pass", true);
                }}
              >
                Override & Pass
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profit Dialog */}
      <Dialog open={!!editProfitDialog?.open} onOpenChange={(open) => !open && setEditProfitDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Edit Challenge Profit
            </DialogTitle>
            <DialogDescription>
              Update profit values for {editProfitDialog?.challengeNumber}
            </DialogDescription>
          </DialogHeader>
          {editProfitDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Account Size:</span>
                  <p className="font-medium">${editProfitDialog.accountSize.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Profit %:</span>
                  <p className="font-medium">{editProfitDialog.currentProfitPercent}%</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Current Balance ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editBalanceValue}
                  onChange={(e) => {
                    setEditBalanceValue(e.target.value);
                    const bal = parseFloat(e.target.value) || 0;
                    const profitAmt = bal - editProfitDialog.accountSize;
                    setEditProfitValue(String(profitAmt.toFixed(2)));
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Profit Amount ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editProfitValue}
                  onChange={(e) => {
                    setEditProfitValue(e.target.value);
                    const profitAmt = parseFloat(e.target.value) || 0;
                    setEditBalanceValue(String((editProfitDialog.accountSize + profitAmt).toFixed(2)));
                  }}
                />
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p>Calculated Profit %: <span className="font-bold text-primary">
                  {editProfitDialog.accountSize > 0
                    ? ((parseFloat(editProfitValue) || 0) / editProfitDialog.accountSize * 100).toFixed(2)
                    : "0"}%
                </span></p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditProfitDialog(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={savingProfit}
                  onClick={async () => {
                    setSavingProfit(true);
                    try {
                      const profitAmount = parseFloat(editProfitValue) || 0;
                      const balance = parseFloat(editBalanceValue) || 0;
                      const profitPercent = editProfitDialog.accountSize > 0
                        ? parseFloat(((profitAmount / editProfitDialog.accountSize) * 100).toFixed(2))
                        : 0;

                      const { error } = await supabase
                        .from("challenges")
                        .update({
                          current_balance: balance,
                          current_profit_amount: profitAmount,
                          current_profit_percent: profitPercent,
                        })
                        .eq("id", editProfitDialog.challengeId);

                      if (error) throw error;

                      // Also update the linked account balance
                      const { data: chDetail } = await supabase
                        .from("challenges")
                        .select("account_id")
                        .eq("id", editProfitDialog.challengeId)
                        .single();

                      if (chDetail?.account_id) {
                        await supabase
                          .from("accounts")
                          .update({ balance, equity: balance })
                          .eq("id", chDetail.account_id);
                      }

                      await logAdminAction("challenge_profit_updated", "challenge", editProfitDialog.challengeId, {
                        challenge_number: editProfitDialog.challengeNumber,
                        old_profit: editProfitDialog.currentProfitAmount,
                        new_profit: profitAmount,
                        new_balance: balance,
                        new_percent: profitPercent,
                      });

                      toast({ title: "Success", description: "Profit values updated successfully" });
                      setEditProfitDialog(null);
                      setRefreshTrigger((t) => t + 1);
                    } catch (e: any) {
                      toast({ title: "Error", description: e.message || "Failed to update profit", variant: "destructive" });
                    } finally {
                      setSavingProfit(false);
                    }
                  }}
                >
                  {savingProfit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Account Detail Modal */}
      <Dialog open={accountDetailModal.open} onOpenChange={(open) => !open && setAccountDetailModal(prev => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
            <DialogDescription>
              {accountDetailModal.account ? `Account: ${(accountDetailModal.account as any).account_number}` : "Loading..."}
            </DialogDescription>
          </DialogHeader>
          {accountDetailModal.loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : accountDetailModal.account ? (
            <div className="space-y-6">
              {/* Account Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">User:</span> <span className="font-medium">{(accountDetailModal.account as any).user_email || "—"}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{(accountDetailModal.account as any).status}</span></div>
                <div><span className="text-muted-foreground">Size:</span> <span className="font-medium">${Number((accountDetailModal.account as any).account_size).toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Balance:</span> <span className="font-medium">${Number((accountDetailModal.account as any).balance).toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Phase:</span> <span className="font-medium">{(accountDetailModal.account as any).phase || "—"}</span></div>
                <div><span className="text-muted-foreground">Program:</span> <span className="font-medium">{(accountDetailModal.account as any).program_type || "—"}</span></div>
              </div>

              {/* Challenge Info */}
              {accountDetailModal.challenge && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Latest Challenge</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 rounded-lg p-3">
                    <div><span className="text-muted-foreground">Challenge:</span> {accountDetailModal.challenge.challenge_number}</div>
                    <div><span className="text-muted-foreground">Status:</span> {accountDetailModal.challenge.status}</div>
                    <div><span className="text-muted-foreground">Profit:</span> {accountDetailModal.challenge.current_profit_percent}%</div>
                    <div><span className="text-muted-foreground">Drawdown:</span> {accountDetailModal.challenge.current_drawdown_percent}%</div>
                    <div><span className="text-muted-foreground">Days Traded:</span> {accountDetailModal.challenge.days_traded}/{accountDetailModal.challenge.min_trading_days}</div>
                    <div><span className="text-muted-foreground">Target:</span> {accountDetailModal.challenge.profit_target_percent}%</div>
                  </div>
                </div>
              )}

              {/* Recent Trades */}
              {accountDetailModal.trades.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Recent Trades</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border">
                        <th className="py-1 px-2 text-left text-muted-foreground">Symbol</th>
                        <th className="py-1 px-2 text-left text-muted-foreground">Dir</th>
                        <th className="py-1 px-2 text-left text-muted-foreground">Lots</th>
                        <th className="py-1 px-2 text-left text-muted-foreground">P&L</th>
                      </tr></thead>
                      <tbody>
                        {accountDetailModal.trades.map(t => (
                          <tr key={t.id} className="border-b border-border/30">
                            <td className="py-1 px-2">{t.symbol}</td>
                            <td className="py-1 px-2">{t.direction}</td>
                            <td className="py-1 px-2">{t.lot_size}</td>
                            <td className={`py-1 px-2 ${(t.pnl || 0) >= 0 ? "text-primary" : "text-destructive"}`}>${(t.pnl || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payouts */}
              {accountDetailModal.payouts.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Payouts</h4>
                  <div className="space-y-1 text-xs">
                    {accountDetailModal.payouts.map(p => (
                      <div key={p.id} className="flex justify-between bg-muted/20 rounded px-3 py-1">
                        <span>${Number(p.amount).toLocaleString()}</span>
                        <span className="text-muted-foreground">{p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Account not found</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
