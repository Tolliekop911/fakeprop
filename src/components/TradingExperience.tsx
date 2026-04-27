import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const benefits = [
  "Raw and Standard Pricing",
  "Tight spreads and low commission for cost-efficient trading",
  "Fast execution under a millisecond",
  "Deep liquidity from Tier-1 providers",
  "Transparent STP with no dealer intervention",
  "Trade 1000+ instruments across global markets"
];

const TradingExperience = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-6">
        <div className="bg-primary/5 border border-primary/20 rounded-3xl overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-12 p-12">
            <div>
              <h2 className="text-4xl lg:text-5xl font-heading font-bold mb-6">
                Enjoy a Tier 1 Trading Experience
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                We are not just an average broker. We offer our clients excellent trading 
                conditions, a rich variety of instruments and competitive commissions which 
                suit every trader's needs. Check the prices of the top instruments being 
                traded on the KUBERA MARKETS platform.
              </p>
              
              <div className="space-y-4 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8">
              <h3 className="text-2xl font-heading font-semibold mb-6">Sign up for a Demo now</h3>
              
              <form className="space-y-4">
                <Input 
                  type="text" 
                  placeholder="Your name"
                  className="bg-background border-border"
                />
                <Input 
                  type="email" 
                  placeholder="Your email"
                  className="bg-background border-border"
                />
                <Button 
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-full shadow-lg hover:shadow-[var(--glow-red)] transition-all"
                >
                  Get Demo
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TradingExperience;
