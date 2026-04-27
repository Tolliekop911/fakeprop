import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

const DisclaimerBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary/10 border-primary/30 border-t backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-xs md:text-sm text-muted-foreground flex-1 text-center">
          Please note that all accounts we provide to our clients are demo accounts with simulated funds and any trading is conducted in a simulated environment. References to trading, traders, revenue, and profit are references to virtual trading, revenues, and profits respectively. More details can be found in the{" "}
          <Link to="/faq" className="font-semibold underline text-primary hover:text-primary/80">
            FAQ
          </Link>{" "}
          section.{" "}
          <button 
            onClick={() => setDismissed(true)}
            className="font-semibold underline text-primary hover:text-primary/80"
          >
            Okay I Understand.
          </button>
        </p>
        <button 
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-muted/50 rounded"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default DisclaimerBanner;
