import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const PRICES: { size: string; original: string; discounted: string }[] = [
  { size: "$25K", original: "$69", discounted: "$34.50" },
  { size: "$50K", original: "$129", discounted: "$64.50" },
  { size: "$100K", original: "$249", discounted: "$124.50" },
  { size: "$200K", original: "$499", discounted: "$249.50" },
];

const PromoPopup = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasShownOnLoad = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    // Always show on load after 1.5s
    const timer = setTimeout(() => {
      setOpen(true);
      hasShownOnLoad.current = true;
    }, 1500);

    // Show on exit intent (mouse leaves viewport top)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setOpen(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText("NEWCOME50");
    setCopied(true);
    toast({ title: "Code copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg border border-primary/20 bg-[hsl(0,0%,9%)] shadow-[0_0_60px_hsl(0_68%_58%/0.15)] p-0 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-foreground">
              50% OFF — Limited to 100 Traders
            </h2>
            <p className="text-sm text-muted-foreground">
              Lock in your discount before spots run out.
            </p>
          </div>

          {/* Savings breakdown */}
          <div className="space-y-2">
            {PRICES.map((p) => (
              <div
                key={p.size}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-[hsl(0,0%,12%)] border border-border/50"
              >
                <span className="text-sm font-semibold text-foreground">{p.size} account</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">{p.original}</span>
                  <span className="text-sm font-bold text-primary">{p.discounted}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Coupon code */}
          <div
            onClick={handleCopy}
            className="flex items-center justify-center gap-3 bg-[hsl(0,0%,12%)] border border-primary/20 rounded-lg p-3.5 cursor-pointer hover:border-primary/40 transition-colors"
          >
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Code:</span>
            <span className="font-mono text-lg font-bold tracking-widest text-foreground">NEWCOME50</span>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </div>

          {/* CTA */}
          <Link to="/prop/login" onClick={handleClose} className="block">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-base rounded-lg shadow-[0_0_30px_hsl(0_68%_58%/0.25)] hover:shadow-[0_0_40px_hsl(0_68%_58%/0.35)] transition-all"
              size="lg"
            >
              Claim My Discount →
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromoPopup;
