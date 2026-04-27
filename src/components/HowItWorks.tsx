import { UserCheck, Wallet, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: UserCheck,
    title: "Register",
    description: "Open a live account and start trading in just minutes."
  },
  {
    icon: Wallet,
    title: "Fund",
    description: "Fund your account using a wide range of funding methods."
  },
  {
    icon: TrendingUp,
    title: "Trade",
    description: "Access 1000+ instruments across all asset classes"
  }
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl lg:text-5xl font-heading font-bold text-center mb-16">
          How it Works
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="bg-card border border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-all group"
            >
              <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-all">
                <step.icon className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-heading font-semibold mb-4">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 rounded-full shadow-lg hover:shadow-[var(--glow-red)] transition-all">
            Create a live account
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
