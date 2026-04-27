import { Scale, TrendingUp, Lock, DollarSign, Wallet } from "lucide-react";

const features = [
  {
    icon: Scale,
    title: "Clear and Transparent trading conditions",
    description: "There are no hidden fees and all trading conditions, including contract specifications, margin requirements and fees are transparent and visible on our website."
  },
  {
    icon: TrendingUp,
    title: "Prove & Trade",
    description: "Complete your evaluation and start trading with simulated funds."
  },
  {
    icon: Lock,
    title: "100% STP Execution",
    description: "We do not B-book any client orders and route all client orders to our liquidity providers for trade execution."
  },
  {
    icon: DollarSign,
    title: "Leverage up to 100:1",
    description: "Traders can take advantage of trading opportunities when they arise with leverage up to 100 to 1."
  },
  {
    icon: Wallet,
    title: "Bi-weekly Payouts",
    description: "Traders can receive payouts by bank wire or crypto anytime once they reach the profit target bi-weekly."
  }
];

const PropWhyChoose = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl lg:text-5xl font-heading font-bold text-center mb-16 text-primary">
          Why Choose Kubera Markets
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="flex gap-4"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-heading font-bold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PropWhyChoose;