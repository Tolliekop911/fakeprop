import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreditCardFormProps {
  amount: number;
  currency?: string;
  onSuccess: (reference: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function detectCardType(number: string): "visa" | "mastercard" | "amex" | "unknown" {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "unknown";
}

const CardIcon = ({ type }: { type: string }) => {
  if (type === "visa") return <span className="text-xs font-extrabold tracking-widest text-blue-400">VISA</span>;
  if (type === "mastercard") return (
    <span className="flex gap-0">
      <span className="w-4 h-4 rounded-full bg-red-500 opacity-90 inline-block" />
      <span className="w-4 h-4 rounded-full bg-yellow-400 opacity-90 -ml-2 inline-block" />
    </span>
  );
  if (type === "amex") return <span className="text-xs font-bold text-blue-300">AMEX</span>;
  return <CreditCard className="w-4 h-4 text-muted-foreground" />;
};

export default function CreditCardForm({
  amount,
  currency = "R",
  onSuccess,
  onCancel,
  submitLabel,
}: CreditCardFormProps) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const cardType = detectCardType(cardNumber);

  const handleSubmit = async () => {
    const rawCard = cardNumber.replace(/\s/g, "");
    if (rawCard.length < 16) {
      toast({ title: "Invalid card number", description: "Enter a 16-digit card number", variant: "destructive" });
      return;
    }
    if (!cardHolder.trim()) {
      toast({ title: "Cardholder name required", variant: "destructive" });
      return;
    }
    const [mm, yy] = expiry.split("/");
    if (!mm || !yy || parseInt(mm) > 12 || parseInt(mm) < 1) {
      toast({ title: "Invalid expiry date", variant: "destructive" });
      return;
    }
    if (cvv.length < 3) {
      toast({ title: "Invalid CVV", variant: "destructive" });
      return;
    }

    setProcessing(true);
    // Simulate card processing delay
    await new Promise((r) => setTimeout(r, 2200));
    const ref = `CC-${Date.now()}`;
    setProcessing(false);
    onSuccess(ref);
  };

  return (
    <div className="space-y-5">
      {/* Card Preview */}
      <div
        className="relative w-full h-44 cursor-pointer select-none"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-between"
            style={{
              backfaceVisibility: "hidden",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-7 h-5 bg-yellow-400/80 rounded-sm" />
                <div className="w-2 h-5 bg-yellow-300/40 rounded-sm" />
              </div>
              <CardIcon type={cardType} />
            </div>
            <div>
              <p className="text-white/40 text-xs mb-1 font-mono tracking-widest">CARD NUMBER</p>
              <p className="text-white font-mono text-lg tracking-widest">
                {cardNumber
                  ? cardNumber.padEnd(19, " ").replace(/(.{4})/g, "$1 ").trim().split("").map((c, i) =>
                      c === " " ? " " : cardNumber.replace(/\s/g, "")[Math.floor(i / 5)] ? c : "•"
                    ).join("")
                  : "•••• •••• •••• ••••"}
              </p>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-white/40 text-xs font-mono tracking-widest">CARDHOLDER</p>
                <p className="text-white font-mono text-sm uppercase tracking-wider truncate max-w-36">
                  {cardHolder || "FULL NAME"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-xs font-mono tracking-widest">EXPIRES</p>
                <p className="text-white font-mono text-sm">{expiry || "MM/YY"}</p>
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl flex flex-col justify-center"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
            }}
          >
            <div className="w-full h-10 bg-gray-800 mt-4" />
            <div className="px-5 mt-4">
              <p className="text-white/40 text-xs mb-1 font-mono tracking-widest">CVV</p>
              <div className="bg-white/90 rounded px-3 py-2 flex items-center justify-between">
                <div className="flex-1 border-b border-gray-300 h-4" />
                <span className="font-mono text-gray-800 text-sm ml-3 min-w-8 text-right">
                  {cvv ? "•".repeat(cvv.length) : ""}
                </span>
              </div>
            </div>
            <p className="text-white/30 text-xs text-center mt-4">Click card to flip</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">Click the card to view back • Tap fields below to fill</p>

      {/* Form Fields */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Card Number</Label>
          <div className="relative">
            <Input
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              maxLength={19}
              className="bg-secondary border-border font-mono pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CardIcon type={cardType} />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cardholder Name</Label>
          <Input
            placeholder="Name on card"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
            className="bg-secondary border-border uppercase"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Expiry Date</Label>
            <Input
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              maxLength={5}
              className="bg-secondary border-border font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">CVV</Label>
            <Input
              placeholder="123"
              value={cvv}
              onChange={(e) => {
                setCvv(e.target.value.replace(/\D/g, "").slice(0, 4));
                setFlipped(true);
              }}
              onBlur={() => setFlipped(false)}
              maxLength={4}
              className="bg-secondary border-border font-mono"
              type="password"
            />
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2">
        <Lock className="w-3 h-3 flex-shrink-0" />
        <span>256-bit SSL encrypted · Your card details are never stored</span>
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={processing}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={processing}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {processing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
          ) : (
            <><CreditCard className="w-4 h-4 mr-2" /> {submitLabel || `Pay ${currency}${amount.toLocaleString()}`}</>
          )}
        </Button>
      </div>
    </div>
  );
}
