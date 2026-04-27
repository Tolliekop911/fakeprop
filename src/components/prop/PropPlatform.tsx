import { Button } from "@/components/ui/button";
import condorLaptop from "@/assets/condor-laptop.png";
import condorMobile from "@/assets/condor-mobile.png";

const PropPlatform = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            {/* Platform Mockup with actual images */}
            <div className="relative">
              {/* Laptop */}
              <img 
                src={condorLaptop} 
                alt="Condor Trading Platform on Desktop" 
                className="w-full h-auto rounded-lg shadow-2xl"
              />
              
              {/* Phone mockup */}
              <img 
                src={condorMobile} 
                alt="Condor Trading Platform on Mobile" 
                className="absolute -left-4 -bottom-8 w-32 h-auto drop-shadow-2xl"
              />
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold leading-tight text-foreground">
              Trade Across Multiple Financial Markets{" "}
              <span className="text-primary">using the Most Popular CFD Trading Platform - Condor</span>
            </h2>
            
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-lg">
              100% STP execution with Tier 1 Liquidity Providers
            </Button>
            
            <p className="text-muted-foreground">
              We select only regulated top trading counterparties which provide us live market prices and trade execution on a wide range of markets on Kubera Markets platform.
            </p>
            
            <p className="text-foreground font-semibold">
              Trade on our Condor platform from your Desktop, Web or Mobile device.
            </p>
            
            <div className="space-y-4 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-foreground">Leverage up to 100:1</span>
              </div>
              <div className="w-full h-px bg-primary/30" />
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-foreground">Trade CFDs on FX, Stock Indices, Precious Metals, Energy and Cryptocurrencies</span>
              </div>
              <div className="w-full h-px bg-primary/30" />
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-foreground">No Commissions, Institutional Liquidity and Variable Spreads</span>
              </div>
              <div className="w-full h-px bg-primary/30" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropPlatform;
