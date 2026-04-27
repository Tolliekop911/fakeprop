import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden hero-pattern">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl lg:text-7xl font-heading font-bold leading-tight">
              Trade Smarter <br />
              <span className="text-gradient-red">with KUBERA MARKETS</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Experience the ultimate trading environment with competitive spreads, 
              lightning-fast execution, and 24/7 support. For expert traders or rookies, 
              KUBERA MARKETS professional platform and specialized resources give you the edge.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 rounded-full shadow-lg hover:shadow-[var(--glow-red)] transition-all">
                Open Live Account
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-foreground/20 hover:border-primary hover:bg-primary/10 rounded-full font-semibold">
                Try Demo Account
              </Button>
            </div>
          </div>
          
          <div className="relative lg:block">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all">
                  <div className="text-4xl font-heading font-bold text-primary mb-2">0.0 pips</div>
                  <div className="text-sm text-muted-foreground">Tight Raw Spreads From</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all">
                  <div className="text-4xl font-heading font-bold text-primary mb-2">24/7</div>
                  <div className="text-sm text-muted-foreground">Support</div>
                </div>
              </div>
              <div className="space-y-6 pt-12">
                <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all">
                  <div className="text-4xl font-heading font-bold text-primary mb-2">$0</div>
                  <div className="text-sm text-muted-foreground">Fee-Free Trading Options</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all">
                  <div className="text-4xl font-heading font-bold text-primary mb-2">1000+</div>
                  <div className="text-sm text-muted-foreground">Financial Instruments</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
    </section>
  );
};

export default Hero;
