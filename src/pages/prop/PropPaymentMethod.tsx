import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Bitcoin, Upload, Loader2, CheckCircle, ArrowLeft, FileText, AlertCircle, Globe, ExternalLink, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreditCardFormComponent from "@/components/CreditCardForm";

const PRICING: Record<string, Record<number, number>> = {
  "1-step": { 5000: 14.99, 10000: 29.99, 25000: 54.99, 50000: 139.99, 100000: 299.99, 200000: 649.99 },
  "2-step": { 5000: 17.99, 10000: 34.99, 25000: 69.99, 50000: 179.99, 100000: 349.99, 200000: 749.99 },
  "halfway-1-step": { 5000: 7.50, 10000: 15.00, 25000: 27.50, 50000: 70.00, 100000: 150.00, 200000: 325.00 },
  "halfway-2-step": { 5000: 9.00, 10000: 17.50, 25000: 35.00, 50000: 90.00, 100000: 175.00, 200000: 375.00 },
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);

const PropPaymentMethod = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const programType = searchParams.get("program") || "1-step";
  const accountSize = Number(searchParams.get("size")) || 50000;
  const couponCode = searchParams.get("coupon") || "";
  const discountPercent = Number(searchParams.get("discount")) || 0;

  const basePrice = PRICING[programType]?.[accountSize] ?? 0;
  const discountedPrice = discountPercent > 0 && basePrice > 0
    ? Math.round(basePrice * (1 - discountPercent / 100) * 100) / 100
    : basePrice;

  const methodParam = searchParams.get("method");
  const [selectedMethod, setSelectedMethod] = useState<"wire_transfer" | "wct" | "card" | null>(
    methodParam === "wct" || methodParam === "wire_transfer" || methodParam === "card" ? methodParam : null
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [wctLoading, setWctLoading] = useState(false);
  const [wctPaymentUrl, setWctPaymentUrl] = useState<string | null>(null);
  const [wctOrderId, setWctOrderId] = useState<string | null>(null);
  const [wctError, setWctError] = useState<string | null>(null);

  // Wire transfer form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [bankAccountUsed, setBankAccountUsed] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    // Pre-fill email from auth
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  const handleCardSuccess = async (reference: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("payment_orders").insert({
        user_id: user.id,
        program_type: programType,
        account_size: accountSize,
        amount: discountedPrice,
        original_amount: basePrice,
        payment_method: "card",
        email: user.email,
        full_name: user.user_metadata?.full_name || "",
        coupon_code: couponCode || null,
        discount_percent: discountPercent,
        status: "confirmed",
        wct_payment_url: reference,
      });
      if (error) throw error;
      setSuccess(true);
      toast({ title: "Payment Successful!", description: "Your challenge has been activated." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleWireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !bankAccountUsed) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Session expired", description: "Please log in again to continue.", variant: "destructive" });
        throw new Error("Not authenticated — please log in again.");
      }

      let proofUrl: string | null = null;

      // Upload proof of payment if provided
      if (proofFile) {
        const fileExt = proofFile.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(filePath, proofFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(filePath);
        proofUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("payment_orders").insert({
        user_id: user.id,
        program_type: programType,
        account_size: accountSize,
        amount: discountedPrice,
        original_amount: basePrice,
        payment_method: "wire_transfer",
        full_name: fullName,
        email,
        bank_account_used: bankAccountUsed,
        proof_of_payment_url: proofUrl,
        coupon_code: couponCode || null,
        discount_percent: discountPercent,
        status: "pending",
      });

      if (error) throw error;
      setSuccess(true);
      toast({ title: "Payment submitted!", description: "Your wire transfer details have been received. We'll review shortly." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const cryptoPaymentId = `CRYPTO-${Date.now().toString().slice(-8)}`;

      const { error } = await supabase.from("payment_orders").insert({
        user_id: user.id,
        program_type: programType,
        account_size: accountSize,
        amount: discountedPrice,
        original_amount: basePrice,
        payment_method: "crypto",
        email: user.email,
        full_name: user.user_metadata?.full_name || "",
        wct_payment_id: cryptoPaymentId,
        coupon_code: couponCode || null,
        discount_percent: discountPercent,
        status: "pending",
      });

      if (error) throw error;
      setSuccess(true);
      toast({ title: "Crypto Payment submitted!", description: "Your payment request has been created. Complete payment to the wallet address provided." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleWCTPayment = async () => {
    setWctLoading(true);
    setWctError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Session expired", description: "Please log in again to continue.", variant: "destructive" });
        throw new Error("Not authenticated — please log in again.");
      }

      // Fetch profile to get full_name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // Create the payment order first
      const { data: newOrder, error: orderError } = await supabase
        .from("payment_orders")
        .insert({
          user_id: session.user.id,
          program_type: programType,
          account_size: accountSize,
          amount: discountedPrice,
          original_amount: basePrice,
          payment_method: "wct",
          email: profile?.email || session.user.email,
          full_name: profile?.full_name || session.user.user_metadata?.full_name || "",
          coupon_code: couponCode || null,
          discount_percent: discountPercent,
          status: "pending",
        })
        .select("id")
        .single();

      if (orderError) {
        console.error("Order insert error:", orderError);
        throw new Error(orderError.message || "Failed to create payment order. Please try again.");
      }
      if (!newOrder) {
        throw new Error("Order was not created. You may need to log out and log back in, then try again.");
      }

      setWctOrderId(newOrder.id);

      // Call the WCT gateway to get the payment link
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/wct-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "createPaymentLink",
          userId: session.user.id,
          challengeId: newOrder.id,
        }),
      });

      const result = await response.json();

      if (result.success && result.paymentUrl) {
        // Save the URL to DB and show it to user
        await supabase.from("payment_orders")
          .update({ wct_payment_url: result.paymentUrl })
          .eq("id", newOrder.id);
        setWctPaymentUrl(result.paymentUrl);
      } else {
        // Gateway unavailable — keep order as pending so admin can follow up, show friendly error
        await supabase.from("payment_orders")
          .update({ admin_notes: "Gateway unreachable at time of order — awaiting manual follow-up" })
          .eq("id", newOrder.id);
        setWctError(result?.error || "Payment gateway is currently unavailable. Please try again or choose a different payment method.");
      }
    } catch (error: any) {
      setWctError("Failed to connect to the payment gateway. Please try again or use a different payment method.");
    } finally {
      setWctLoading(false);
    }
  };

  if (success) {
    return (
      <PropDashboardLayout title="Payment Submitted">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-lg w-full text-center">
              <CardContent className="pt-8 pb-8 space-y-6">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Payment Submitted Successfully!</h2>
                  <p className="text-muted-foreground">
                    Your payment for the <span className="font-semibold text-foreground">{formatMoney(accountSize)}</span>{" "}
                    <span className="font-semibold text-primary">{programType?.toUpperCase()}</span> challenge has been recorded.
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
                  <p className="font-semibold text-foreground">Payments are manually reviewed.</p>
                  <p>Account activation happens after approval. You'll be notified once your payment is verified.</p>
                </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.open('/prop/payments', '_blank', 'noreferrer')} variant="outline">
                  View Payment History
                </Button>
                <Button onClick={() => window.open('/prop/dashboard', '_blank', 'noreferrer')}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PropDashboardLayout>
    );
  }

  return (
    <PropDashboardLayout title="Payment Method">
      <div className="space-y-6">
        {/* Back button & order summary */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Program</p>
                <p className="font-bold">{programType?.toUpperCase()}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Account Size</p>
                <p className="font-bold">{formatMoney(accountSize)}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
                <p className="font-bold text-primary">{formatMoney(discountedPrice)}</p>
                {discountPercent > 0 && (
                  <p className="text-xs text-muted-foreground line-through">{formatMoney(basePrice)}</p>
                )}
              </div>
              {couponCode && (
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Coupon</p>
                  <p className="font-bold text-primary">{couponCode} (-{discountPercent}%)</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        {!selectedMethod && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card Payment */}
            <Card
              className="cursor-pointer border-2 hover:border-primary/50 transition-all"
              onClick={() => setSelectedMethod("card")}
            >
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Card Payment</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pay instantly with Visa, Mastercard or Amex.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Crypto Payment (WCT) */}
            <Card
              className="cursor-pointer border-2 hover:border-primary/50 transition-all"
              onClick={() => setSelectedMethod("wct")}
            >
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Bitcoin className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Crypto Payment</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pay with your preferred cryptocurrency via our secure payment gateway.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer border-2 hover:border-primary/50 transition-all"
              onClick={() => setSelectedMethod("wire_transfer")}
            >
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Wire Transfer</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send funds directly via bank transfer. Manually reviewed within 24-48 hours.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Card Payment */}
        {selectedMethod === "card" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedMethod(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Choose Different Method
            </Button>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Card Payment
                </CardTitle>
                <CardDescription>Pay instantly — your challenge is activated immediately on success.</CardDescription>
              </CardHeader>
              <CardContent>
                <CreditCardFormComponent
                  amount={discountedPrice}
                  currency="$"
                  onSuccess={handleCardSuccess}
                  onCancel={() => setSelectedMethod(null)}
                  submitLabel={`Pay ${formatMoney(discountedPrice)}`}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* WCT Online Payment */}
        {selectedMethod === "wct" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedMethod(null); setWctPaymentUrl(null); setWctOrderId(null); setWctError(null); }}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Choose Different Method
            </Button>
            <Card>
              <CardContent className="pt-8 pb-8">
                {wctError ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-destructive" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Gateway Unavailable</h3>
                        <p className="text-muted-foreground text-sm">The online payment gateway is currently unreachable.</p>
                      </div>
                    </div>
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-sm text-muted-foreground">
                      <p>Please try again shortly, or choose a different payment method such as Wire Transfer or Crypto.</p>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => { setWctError(null); }} variant="outline" className="flex-1">
                        Try Again
                      </Button>
                      <Button onClick={() => { setSelectedMethod(null); setWctError(null); }} className="flex-1">
                        Choose Different Method
                      </Button>
                    </div>
                  </div>
                ) : !wctPaymentUrl ? (
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Globe className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Crypto Payment</h3>
                      <p className="text-muted-foreground mb-6">
                        Click below to generate your personal payment link. You'll be able to choose your preferred cryptocurrency and complete payment within the allotted time window.
                      </p>
                      <Button
                        onClick={handleWCTPayment}
                        disabled={wctLoading}
                        size="lg"
                        className="gap-2"
                      >
                        {wctLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
                        {wctLoading ? "Generating payment link..." : `Get Payment Link — ${formatMoney(discountedPrice)}`}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Payment Link Ready!</h3>
                        <p className="text-muted-foreground text-sm">Your order has been created. Complete payment before the link expires.</p>
                      </div>
                    </div>

                    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-bold text-primary">{formatMoney(discountedPrice)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Program</span>
                        <span className="font-semibold">{programType?.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-semibold text-foreground">How to pay:</p>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Click the button below to open your payment page</li>
                        <li>Choose your preferred cryptocurrency (USDT, BTC, etc.)</li>
                        <li>Send the exact amount within the time limit shown</li>
                        <li>Once confirmed, we will issue your trading account</li>
                      </ol>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        size="lg"
                        className="flex-1 gap-2"
                        onClick={() => window.open(wctPaymentUrl, "_blank")}
                      >
                        <ExternalLink className="w-5 h-5" />
                        Go to Payment Page
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open('/prop/payments', '_blank', 'noreferrer')}
                      >
                        View My Orders
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      After payment, your order status will update automatically. If you have issues, contact support with your order reference.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Wire Transfer Form */}
        {selectedMethod === "wire_transfer" && (
          <div className="space-y-6">
            <Button variant="ghost" size="sm" onClick={() => setSelectedMethod(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Choose Different Method
            </Button>

            {/* Bank Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Bank Details
                </CardTitle>
                <CardDescription>
                  Transfer funds to the following account. Include your order reference in the payment description.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 md:p-5 space-y-3 font-mono text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-2">
                    <span className="text-muted-foreground">Bank Name:</span>
                    <span className="font-semibold">PT Bank Muamalat Indonesia, TBK</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-2">
                    <span className="text-muted-foreground">Bank Address:</span>
                    <span>Kuala Lumpur International Office<br />Suite 1.03 – 1.05, Wisma Goldhill<br />No. 67, Jalan Raja Chulan, 50200 Kuala Lumpur</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-2">
                    <span className="text-muted-foreground">Account (USD):</span>
                    <div>
                      <span className="block font-semibold">9010015738</span>
                      <span className="block font-semibold">9010015740</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-2">
                    <span className="text-muted-foreground">SWIFT Code:</span>
                    <span className="font-semibold">MUABIDJA</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-2">
                    <span className="text-muted-foreground">Jurisdiction:</span>
                    <span className="font-semibold">Malaysia</span>
                  </div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-600 dark:text-yellow-400">
                  <p><strong>Important:</strong> Include your email address or order reference in the payment description for faster processing.</p>
                </div>
              </CardContent>
            </Card>

            {/* Wire Transfer Form */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Confirmation</CardTitle>
                <CardDescription>Submit your payment details after completing the wire transfer.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleWireSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Bank Account Number Used *</Label>
                    <Input
                      value={bankAccountUsed}
                      onChange={(e) => setBankAccountUsed(e.target.value)}
                      placeholder="Which account did you transfer to? (e.g. 9010015738)"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Proof of Payment (PDF / JPG / PNG)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="proof-upload"
                      />
                      <label htmlFor="proof-upload" className="cursor-pointer">
                        {proofFile ? (
                          <div className="flex items-center justify-center gap-2 text-primary">
                            <FileText className="w-5 h-5" />
                            <span className="font-medium">{proofFile.name}</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                            <p className="text-sm text-muted-foreground">Click to upload proof of payment</p>
                            <p className="text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                    ) : (
                      <>Submit Wire Transfer - {formatMoney(discountedPrice)}</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </PropDashboardLayout>
  );
};

export default PropPaymentMethod;
