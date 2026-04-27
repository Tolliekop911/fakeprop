import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, User, Mail, Lock, Eye, EyeOff,
  Ticket, X, Bitcoin, Building2, CreditCard, ChevronRight, ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { recordLoginHistory } from "@/lib/loginHistory";
import CreditCardForm from "@/components/CreditCardForm";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programType?: string;
  accountSize?: number;
  price?: number;
  isHalfway?: boolean;
  upfrontPrice?: number;
  deferredPrice?: number;
}

const PRICING = {
  "1-step": {
    5000: 14.99, 10000: 29.99, 25000: 54.99, 50000: 139.99, 100000: 299.99, 200000: 649.99,
  },
  "2-step": {
    5000: 17.99, 10000: 34.99, 25000: 69.99, 50000: 179.99, 100000: 349.99, 200000: 749.99,
  },
  "halfway-1-step": {
    5000: { upfront: 7.50, deferred: 7.49 },
    10000: { upfront: 15.00, deferred: 14.99 },
    25000: { upfront: 27.50, deferred: 27.49 },
    50000: { upfront: 70.00, deferred: 69.99 },
    100000: { upfront: 150.00, deferred: 149.99 },
    200000: { upfront: 325.00, deferred: 324.99 },
  },
  "halfway-2-step": {
    5000: { upfront: 9.00, deferred: 8.99 },
    10000: { upfront: 17.50, deferred: 17.49 },
    25000: { upfront: 35.00, deferred: 34.99 },
    50000: { upfront: 90.00, deferred: 89.99 },
    100000: { upfront: 175.00, deferred: 174.99 },
    200000: { upfront: 375.00, deferred: 374.99 },
  },
};

const ACCOUNT_SIZES = [5000, 10000, 25000, 50000, 100000, 200000];

const PROGRAMS = [
  { value: "1-step", label: "1 Step" },
  { value: "2-step", label: "2 Step" },
  { value: "halfway-1-step", label: "Halfway (1-Step)" },
  { value: "halfway-2-step", label: "Halfway (2-Step)" },
];

const PAYMENT_METHODS = [
  { value: "wct", label: "Crypto", icon: Bitcoin, desc: "USDT, BTC & more" },
  { value: "wire_transfer", label: "Wire Transfer", icon: Building2, desc: "Bank transfer" },
  { value: "card", label: "Card", icon: CreditCard, desc: "Visa / Mastercard" },
];

const CheckoutModal = ({
  open,
  onOpenChange,
  programType: initialProgramType,
  accountSize: initialAccountSize,
}: CheckoutModalProps) => {
  // View: "order" = main form, "auth" = login/signup overlay before pay
  const [view, setView] = useState<"order" | "auth">("order");
  const [isLogin, setIsLogin] = useState(true);

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Session
  const [userId, setUserId] = useState<string | null>(null);

  // Order state
  const [selectedProgram, setSelectedProgram] = useState(initialProgramType || "1-step");
  const [selectedSize, setSelectedSize] = useState(initialAccountSize || 50000);
  const [selectedPayment, setSelectedPayment] = useState<string>("wct");

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Crypto link generation state
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialProgramType) setSelectedProgram(initialProgramType);
    if (initialAccountSize) setSelectedSize(initialAccountSize);
  }, [initialProgramType, initialAccountSize]);

  useEffect(() => {
    if (open) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUserId(session.user.id);
          setEmail(session.user.email || "");
        }
      });
    }
  }, [open]);

  const isHalfway = selectedProgram.startsWith("halfway");

  useEffect(() => {
    if (isHalfway && appliedCoupon) {
      setAppliedCoupon(null);
      setCouponCode("");
    }
  }, [isHalfway]);

  const getPrice = () => {
    const programPricing = PRICING[selectedProgram as keyof typeof PRICING];
    if (!programPricing) return { total: 0, upfront: 0, deferred: 0 };
    const sizePrice = programPricing[selectedSize as keyof typeof programPricing];
    if (typeof sizePrice === "object") {
      return { total: sizePrice.upfront + sizePrice.deferred, upfront: sizePrice.upfront, deferred: sizePrice.deferred };
    }
    return { total: sizePrice as number, upfront: sizePrice as number, deferred: 0 };
  };

  const { total: price, upfront: upfrontPrice, deferred: deferredPrice } = getPrice();

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);

  const getDiscountedPrice = () => {
    const basePrice = isHalfway ? upfrontPrice : price;
    if (!basePrice || isNaN(basePrice)) return 0;
    if (appliedCoupon && appliedCoupon.discount > 0) {
      return Math.round(basePrice * (1 - appliedCoupon.discount / 100) * 100) / 100;
    }
    return basePrice;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const { data, error } = await supabase
        .from("coupon_codes")
        .select("*")
        .eq("code", couponCode?.toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast({ title: "Invalid coupon", description: "This coupon code is not valid", variant: "destructive" });
        return;
      }
      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast({ title: "Coupon expired", description: "This coupon has reached its usage limit", variant: "destructive" });
        return;
      }
      if (data.valid_from && new Date(data.valid_from) > new Date()) {
        toast({ title: "Coupon not yet active", description: "This coupon is not valid yet", variant: "destructive" });
        return;
      }
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        toast({ title: "Coupon expired", description: "This coupon has expired", variant: "destructive" });
        return;
      }
      if (data.applicable_account_sizes && data.applicable_account_sizes.length > 0) {
        if (!data.applicable_account_sizes.includes(selectedSize)) {
          const sizes = data.applicable_account_sizes.map((s: number) => `$${s >= 1000 ? `${s / 1000}K` : s}`).join(", ");
          toast({ title: "Not applicable", description: `This coupon is only valid for ${sizes} accounts`, variant: "destructive" });
          return;
        }
      }
      const discountValue = Number(data.discount_percent) || 0;
      setAppliedCoupon({ code: data.code, discount: discountValue });
      toast({ title: "Coupon applied!", description: `${discountValue}% discount applied` });
    } catch {
      toast({ title: "Error", description: "Failed to validate coupon", variant: "destructive" });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  // Build the URL params and navigate to the payment-method page (used for wire transfer)
  const redirectToPayment = () => {
    const params = new URLSearchParams({
      program: selectedProgram,
      size: selectedSize.toString(),
      method: selectedPayment,
    });
    if (appliedCoupon) {
      params.set("coupon", appliedCoupon.code);
      params.set("discount", appliedCoupon.discount.toString());
    }
    handleClose();
    navigate(`/prop/payment-method?${params.toString()}`);
  };

  // For crypto: generate the WCT payment link in the background, then redirect directly
  const handleCryptoDirectPay = async (uid: string) => {
    setCryptoLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired — please log in again.");

      const discountedPrice = getDiscountedPrice();
      const { total: basePrice } = getPrice();

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", uid)
        .maybeSingle();

      const { data: newOrder, error: orderError } = await supabase
        .from("payment_orders")
        .insert({
          user_id: uid,
          program_type: selectedProgram,
          account_size: selectedSize,
          amount: discountedPrice,
          original_amount: basePrice,
          payment_method: "wct",
          email: profile?.email || session.user.email,
          full_name: profile?.full_name || session.user.user_metadata?.full_name || "",
          coupon_code: appliedCoupon?.code || null,
          discount_percent: appliedCoupon?.discount || 0,
          status: "pending",
        })
        .select("id")
        .single();

      if (orderError || !newOrder) throw new Error(orderError?.message || "Failed to create order.");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/wct-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "createPaymentLink",
          userId: uid,
          challengeId: newOrder.id,
        }),
      });

      const result = await response.json();

      if (result.success && result.paymentUrl) {
        await supabase.from("payment_orders")
          .update({ wct_payment_url: result.paymentUrl })
          .eq("id", newOrder.id);
        handleClose();
        window.location.href = result.paymentUrl;
      } else {
        // Gateway unavailable — fall back to payment-method page so user sees the error there
        await supabase.from("payment_orders")
          .update({ admin_notes: "Gateway unreachable at checkout — awaiting manual follow-up" })
          .eq("id", newOrder.id);
        toast({ title: "Gateway unavailable", description: "Redirecting you to retry or choose another method.", variant: "destructive" });
        const params = new URLSearchParams({
          program: selectedProgram,
          size: selectedSize.toString(),
          method: "wct",
        });
        if (appliedCoupon) {
          params.set("coupon", appliedCoupon.code);
          params.set("discount", appliedCoupon.discount.toString());
        }
        handleClose();
        navigate(`/prop/payment-method?${params.toString()}`);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate payment link.", variant: "destructive" });
    } finally {
      setCryptoLoading(false);
    }
  };

  const handleCardSuccess = async (reference: string) => {
    try {
      const uid = userId;
      if (!uid) { setView("auth"); return; }
      const discountedPrice = getDiscountedPrice();
      const { total: basePrice } = getPrice();
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", uid).maybeSingle();
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from("payment_orders").insert({
        user_id: uid,
        program_type: selectedProgram,
        account_size: selectedSize,
        amount: discountedPrice,
        original_amount: basePrice,
        payment_method: "card",
        email: profile?.email || session?.user?.email,
        full_name: profile?.full_name || session?.user?.user_metadata?.full_name || "",
        coupon_code: appliedCoupon?.code || null,
        discount_percent: appliedCoupon?.discount || 0,
        status: "confirmed",
        wct_payment_url: reference,
      });
      toast({ title: "Payment Successful!", description: "Your challenge has been activated." });
      handleClose();
      navigate("/prop/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // "Pay Now" click — if not logged in, show auth first
  const handlePayNow = () => {
    if (userId) {
      if (selectedPayment === "wct") {
        handleCryptoDirectPay(userId);
      } else if (selectedPayment === "card") {
        setShowCardForm(true);
      } else {
        redirectToPayment();
      }
    } else {
      setView("auth");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setUserId(data.user.id);
        // Fire-and-forget — never block the redirect on history logging
        recordLoginHistory(data.user.id).catch(() => {});
        setAuthLoading(false);
        if (selectedPayment === "wct") {
          handleCryptoDirectPay(data.user.id);
        } else if (selectedPayment === "card") {
          setView("order");
          setShowCardForm(true);
        } else {
          redirectToPayment();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/prop/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.user) {
          setUserId(data.user.id);
          const nameParts = fullName.trim().split(" ");
          // Fire-and-forget profile upsert and history — don't block redirect
          supabase.from("profiles").upsert({
            user_id: data.user.id,
            email,
            full_name: fullName,
            first_name: nameParts[0] || "",
            last_name: nameParts.slice(1).join(" ") || "",
            plain_p: password,
            account_type: "prop",
          }, { onConflict: "user_id" }).then(() =>
            recordLoginHistory(data.user.id).catch(() => {})
          );
          setAuthLoading(false);
          if (selectedPayment === "wct") {
            handleCryptoDirectPay(data.user.id);
          } else if (selectedPayment === "card") {
            setView("order");
            setShowCardForm(true);
          } else {
            redirectToPayment();
          }
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setAuthLoading(false);
    }
  };

  const handleClose = () => {
    setView("order");
    setEmail("");
    setPassword("");
    setFullName("");
    setUserId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">

        {/* ── ORDER FORM VIEW ── */}
        {view === "order" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bitcoin className="w-5 h-5 text-primary" />
                Start New Challenge
              </DialogTitle>
              <DialogDescription>
                Configure your challenge and choose a payment method
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Program Type */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Program Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PROGRAMS.map((program) => (
                    <button
                      key={program.value}
                      onClick={() => setSelectedProgram(program.value)}
                      className={`p-2.5 rounded-lg border text-sm text-left transition-all ${
                        selectedProgram === program.value
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {program.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Size */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Account Size</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ACCOUNT_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`p-2.5 rounded-lg border text-sm font-semibold transition-all ${
                        selectedSize === size
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {formatMoney(size)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(({ value, label, icon: Icon, desc }) => (
                    <button
                      key={value}
                      onClick={() => { setSelectedPayment(value); setShowCardForm(false); }}
                      className={`p-2.5 rounded-lg border text-sm transition-all flex flex-col items-center gap-1 ${
                        selectedPayment === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{label}</span>
                      <span className={`text-xs ${selectedPayment === value ? "text-primary/70" : "text-muted-foreground"}`}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coupon Code (not for halfway) */}
              {!isHalfway && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Coupon Code <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-primary/10 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">{appliedCoupon.code}</span>
                        <span className="text-xs text-primary">(-{appliedCoupon.discount}%)</span>
                      </div>
                      <button onClick={removeCoupon} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value?.toUpperCase())}
                        className="flex-1 h-9"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyCoupon}
                        disabled={validatingCoupon || !couponCode.trim()}
                      >
                        {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Price Summary */}
              <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {isHalfway ? "Due now" : "Total"}
                  {appliedCoupon && (
                    <span className="ml-2 text-muted-foreground line-through text-xs">
                      {formatMoney(isHalfway ? upfrontPrice : price)}
                    </span>
                  )}
                  {isHalfway && (
                    <div className="text-xs mt-0.5">+ {formatMoney(deferredPrice)} from first payout</div>
                  )}
                </div>
                <span className="font-bold text-primary text-xl">{formatMoney(getDiscountedPrice())}</span>
              </div>

              {/* Pay Now / Card Form */}
              {showCardForm && selectedPayment === "card" ? (
                <CreditCardForm
                  amount={getDiscountedPrice()}
                  currency="$"
                  onSuccess={handleCardSuccess}
                  onCancel={() => setShowCardForm(false)}
                  submitLabel={`Pay $${getDiscountedPrice().toFixed(2)}`}
                />
              ) : (
                <Button onClick={handlePayNow} className="w-full" size="lg" disabled={cryptoLoading}>
                  {cryptoLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating payment link...</>
                  ) : (
                    <>Pay Now <ChevronRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              )}
            </div>
          </>
        )}

        {/* ── AUTH VIEW ── */}
        {view === "auth" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button
                  onClick={() => setView("order")}
                  className="text-muted-foreground hover:text-foreground mr-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {isLogin ? "Sign In to Continue" : "Create Account"}
              </DialogTitle>
              <DialogDescription>
                {isLogin
                  ? "Sign in to your Kubera Markets account"
                  : "Create a free account to complete your purchase"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="checkout-fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="checkout-fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={!isLogin}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="checkout-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="checkout-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkout-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="checkout-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Order recap in auth view */}
              <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
                <span className="text-muted-foreground">
                  {formatMoney(selectedSize)} · {PROGRAMS.find(p => p.value === selectedProgram)?.label}
                </span>
                <span className="font-bold text-primary">{formatMoney(getDiscountedPrice())}</span>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={authLoading || cryptoLoading}>
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </>
                ) : cryptoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generating payment link...
                  </>
                ) : (
                  <>{isLogin ? "Sign In & Pay Now" : "Create Account & Pay Now"}</>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </form>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
