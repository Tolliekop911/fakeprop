import { Button } from "@/components/ui/button";

const rules = [
  { label: "Profit Target", evaluation: "8%", funded: "8%" },
  { label: "Max Drawdown", evaluation: "4%", funded: "4%" },
  { label: "Daily Drawdown", evaluation: "2%", funded: "2%" },
  { label: "Min Trading Days", evaluation: "3 days", funded: "3 days" },
  { label: "Time Limit", evaluation: "90 Days", funded: "N/A" },
  { label: "Hold Positions O/N or WE", evaluation: "Allowed", funded: "Allowed" },
  { label: "News Trading", evaluation: "Allowed", funded: "Allowed" },
  { label: "Tick Scalping", evaluation: "Not Allowed", funded: "Not Allowed" },
  { label: "All Other Strategies Accepted", evaluation: "Yes", funded: "Yes" },
  { label: "Profit Split", evaluation: "-", funded: "80%" },
  { label: "Payouts", evaluation: "-", funded: "Bi-weekly" },
];

const PropHowItWorks = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-heading font-bold mb-4 text-foreground">
            How it Works
          </h2>
          <p className="text-lg text-foreground mb-2">Register by clicking Zero Fee</p>
          <p className="text-lg text-foreground mb-6">Pass the evaluation by reaching an 8% profit target</p>
          <p className="text-primary font-semibold mb-2">
            Purchase a fully funded $1,000 trading account for $9.99 or a 5k account for $24.99.
          </p>
          <p className="text-foreground">
            Participate in a 50% profit share, with the chance to scale to larger accounts.
          </p>
          <p className="text-foreground">
            Our evaluation uses minimal rules so you can focus on what matters: your performance.
          </p>
        </div>

        <div className="text-center mb-12">
          <h3 className="text-3xl lg:text-4xl font-heading font-bold mb-2 text-foreground">
            Start Here, By Pressing the
          </h3>
          <p className="text-2xl text-primary font-bold uppercase mb-4">Zero Fee Button</p>
          <p className="text-4xl font-heading font-bold text-foreground mb-6">$1000</p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-12 py-6 rounded-full text-xl shadow-lg hover:shadow-[var(--glow-red)] transition-all"
          >
            Zero Fee
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
            <div></div>
            <div className="text-muted-foreground font-semibold">Evaluation</div>
            <div className="text-muted-foreground font-semibold">Funded</div>
          </div>
          
          {rules.map((rule, index) => (
            <div 
              key={index} 
              className="grid grid-cols-3 gap-4 py-3 border-b border-border/30 text-center"
            >
              <div className="text-left text-muted-foreground">{rule.label}</div>
              <div className="text-foreground">{rule.evaluation}</div>
              <div className="text-foreground">{rule.funded}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PropHowItWorks;
