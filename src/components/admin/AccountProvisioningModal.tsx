import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/adminLogger";

interface AccountProvisioningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  userName?: string;
  onSuccess: () => void;
}

const ACCOUNT_SIZES = [5000, 10000, 25000, 50000, 100000, 200000];
const PROGRAM_TYPES = [
  { value: "1-step", label: "1 Step" },
  { value: "2-step", label: "2 Step" },
  { value: "halfway-1", label: "Halfway There (1-Step)" },
  { value: "halfway-2", label: "Halfway There (2-Step)" },
];
const PHASES = [
  { value: "phase1", label: "Phase 1 (Evaluation)" },
  { value: "phase2", label: "Phase 2 (Verification)" },
  { value: "funded", label: "Funded Account" },
];

interface PaymentOrder {
  id: string;
  order_reference: string;
  amount: number;
  account_size: number;
  program_type: string;
  status: string;
  created_at: string;
}

const AccountProvisioningModal = ({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
  onSuccess,
}: AccountProvisioningModalProps) => {
  const [accountSize, setAccountSize] = useState<string>("50000");
  const [programType, setProgramType] = useState<string>("1-step");
  const [phase, setPhase] = useState<string>("phase1");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

  // Fetch payment orders for this user when modal opens
  useEffect(() => {
    if (!open || !userId) return;
    const fetchOrders = async () => {
      setLoadingOrders(true);
      const { data, error } = await supabase
        .from("payment_orders")
        .select("id, order_reference, amount, account_size, program_type, status, created_at")
        .eq("user_id", userId)
        .in("status", ["pending", "paid", "approved"])
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPaymentOrders(data);
        if (data.length > 0) setSelectedOrderId(data[0].id);
      }
      setLoadingOrders(false);
    };
    fetchOrders();
  }, [open, userId]);

  // Fetch profile_id for the user
  const fetchProfileId = async (): Promise<string | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (error || !data) {
      console.error("Failed to fetch profile:", error);
      return null;
    }
    return data.id;
  };

  const callCreateChallengeAccount = async (profileId: string, challengeId: string) => {
    const { data, error } = await supabase.functions.invoke("create-challenge-account", {
      body: { userId, profileId, challengeId },
    });

    if (error) {
      console.error("External API call failed:", error);
      toast({
        title: "External API Warning",
        description: "Account created locally but external system notification failed. Check logs.",
        variant: "destructive",
      });
    } else {
      console.log("External API response:", data);
    }
  };

  const handleCreateAccount = async () => {
    if (!selectedOrderId) {
      toast({ title: "Select Payment Order", description: "Please select a payment order to link.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const size = parseInt(accountSize);
      const effectiveProgramType = programType.replace("halfway-", "");

      // Fetch rules from the rules table for this program/size
      const { data: ruleData, error: ruleError } = await supabase
        .from("rules")
        .select("*")
        .eq("program_type", effectiveProgramType)
        .eq("account_size", size)
        .single();

      if (ruleError || !ruleData) {
        toast({
          title: "Rules Not Found",
          description: `No rules configured for ${effectiveProgramType} / ${formatMoney(size)}. Please add rules first.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const accountNumber = `PROP-${Array.from(crypto.getRandomValues(new Uint8Array(6)), b => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[b % 36]).join('')}`;
      const status = "active";
      const accountPhase = phase;

      const { error: accountError, data: accountData } = await supabase
        .from("accounts")
        .insert({
          user_id: userId,
          account_number: accountNumber,
          account_type: "prop",
          account_size: size,
          balance: size,
          equity: size,
          status,
          phase: accountPhase,
          program_type: effectiveProgramType,
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // Create challenge using rules from DB
      const challengeNumber = `CH-${Array.from(crypto.getRandomValues(new Uint8Array(8)), b => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[b % 36]).join('')}`;
      const profitTargetPercent = phase === "phase1"
        ? ruleData.profit_target_phase1
        : phase === "phase2"
        ? (ruleData.profit_target_phase2 ?? 0)
        : 0;
      const profitTargetAmount = size * (profitTargetPercent / 100);
      const maxDrawdownPercent = ruleData.max_drawdown;
      const maxDrawdownAmount = size * (maxDrawdownPercent / 100);
      const dailyDrawdownPercent = ruleData.daily_drawdown;

      const { data: challengeData, error: challengeError } = await supabase.from("challenges").insert({
        user_id: userId,
        account_id: accountData.id,
        challenge_number: challengeNumber,
        program_type: effectiveProgramType,
        account_size: size,
        current_balance: size,
        profit_target_percent: profitTargetPercent,
        profit_target_amount: profitTargetAmount,
        max_drawdown_percent: maxDrawdownPercent,
        max_drawdown_amount: maxDrawdownAmount,
        daily_drawdown_percent: dailyDrawdownPercent,
        min_trading_days: ruleData.min_trading_days,
        phase,
        status: "active",
      }).select().single();

      if (challengeError) throw challengeError;

      // Update payment order to approved
      await supabase
        .from("payment_orders")
        .update({
          status: "approved",
          admin_notes: `Manually provisioned. Account: ${accountNumber}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedOrderId);

      // Call external API with the challenge ID
      const profileId = await fetchProfileId();
      if (profileId) {
        const { data: apiResult, error: apiError } = await supabase.functions.invoke("create-challenge-account", {
          body: { userId, profileId, challengeId: challengeData.id },
        });

        if (apiError || apiResult?.error) {
          console.error("External API call failed, rolling back:", apiError || apiResult?.error);
          // Rollback: delete challenge and account records, revert payment order
          await supabase.from("challenges").delete().eq("id", challengeData.id);
          await supabase.from("accounts").delete().eq("id", accountData.id);
          await supabase.from("payment_orders").update({ status: "pending", admin_notes: null, updated_at: new Date().toISOString() }).eq("id", selectedOrderId);
          toast({
            title: "Provisioning Failed",
            description: "External API failed. Account and challenge records have been rolled back.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      } else {
        // No profile — rollback
        await supabase.from("challenges").delete().eq("id", challengeData.id);
        await supabase.from("accounts").delete().eq("id", accountData.id);
        await supabase.from("payment_orders").update({ status: "pending", admin_notes: null, updated_at: new Date().toISOString() }).eq("id", selectedOrderId);
        toast({
          title: "Provisioning Failed",
          description: "Could not find user profile. Records rolled back.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      await logAdminAction("account_provisioned", "account", accountData.id, {
        account_number: accountNumber,
        user_id: userId,
        account_size: size,
        program_type: programType,
        phase,
        payment_order_id: selectedOrderId,
      });

      toast({
        title: "Account Created",
        description: `${formatMoney(size)} ${programType} account (${phase}) issued to ${userName || userEmail}`,
      });

      onSuccess();
      onOpenChange(false);

      // Reset form
      setAccountSize("50000");
      setProgramType("1-step");
      setPhase("phase1");
      setSelectedOrderId("");
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Issue New Account
          </DialogTitle>
          <DialogDescription>
            Create a new trading account for {userName || userEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Order Selection */}
          <div className="space-y-2">
            <Label>Payment Order *</Label>
            {loadingOrders ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading orders...
              </div>
            ) : paymentOrders.length === 0 ? (
              <p className="text-sm text-destructive">No pending/paid orders found for this user.</p>
            ) : (
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment order" />
                </SelectTrigger>
                <SelectContent>
                  {paymentOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.order_reference} — {formatMoney(order.amount)} ({order.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Account Size</Label>
            <Select value={accountSize} onValueChange={setAccountSize}>
              <SelectTrigger>
                <SelectValue placeholder="Select account size" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_SIZES.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {formatMoney(size)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Program Type</Label>
            <Select value={programType} onValueChange={setProgramType}>
              <SelectTrigger>
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {PROGRAM_TYPES.map((program) => (
                  <SelectItem key={program.value} value={program.value}>
                    {program.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Starting Phase</Label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger>
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                {PHASES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">User</span>
              <span className="font-medium">{userName || userEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Size</span>
              <span className="font-medium">{formatMoney(parseInt(accountSize))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Program</span>
              <span className="font-medium">{PROGRAM_TYPES.find(p => p.value === programType)?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phase</span>
              <span className="font-medium">{PHASES.find(p => p.value === phase)?.label}</span>
            </div>
            {selectedOrderId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order</span>
                <span className="font-medium">{paymentOrders.find(o => o.id === selectedOrderId)?.order_reference}</span>
              </div>
            )}
          </div>

          <Button onClick={handleCreateAccount} className="w-full" disabled={loading || !selectedOrderId}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Issue Account
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountProvisioningModal;
