import { Star, Monitor, BookOpen, Server } from "lucide-react";

const features = [
  {
    icon: Star,
    title: "Personal Account Manager",
    description: "A dedicated account manager for personalised guidance"
  },
  {
    icon: Monitor,
    title: "Powerful Condor Platform",
    description: "Benefit from our market-leading and innovative Condor platform"
  },
  {
    icon: BookOpen,
    title: "Educational Material",
    description: "Access to top-tier education and market research"
  },
  {
    icon: Server,
    title: "Virtual Private Server",
    description: "Active traders can enjoy free VPS services for seamless execution"
  }
];

const Features = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-heading font-bold mb-6">
            Giving you an edge in <br />
            <span className="text-gradient-red">the markets</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Take your trading to the next level with expertly curated support and 
            tools designed to enhance your performance.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-card border border-border rounded-2xl p-8 hover:border-primary/50 transition-all group"
            >
              <div className="w-16 h-16 mb-6 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-all">
                <feature.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-heading font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
