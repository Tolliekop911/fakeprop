import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import PhoneMockup from "@/components/prop/PhoneMockup";

const TrustpilotStar = ({ fill }: { fill: "full" | "partial" | "empty" }) => {
  if (fill === "full") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#00B67A" />
      </svg>
    );
  }
  if (fill === "partial") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24">
        <defs>
          <clipPath id="tp-half">
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#dcdce6" />
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#00B67A" clipPath="url(#tp-half)" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#dcdce6" />
    </svg>
  );
};

const PropHero = () => {
  // 3.2 stars = 3 full, 1 partial (~20% filled), 1 empty
  const stars: ("full" | "partial" | "empty")[] = ["full", "full", "full", "partial", "empty"];

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 order-1 lg:order-1">
            <h1 className="text-5xl lg:text-7xl font-heading font-bold leading-tight">
              <span className="text-primary">Trade With</span>
              <br />
              <span className="text-foreground">Kubera Markets</span>
            </h1>
            
            <p className="text-lg text-foreground font-semibold max-w-xl">
              We are committed to empowering every retail trader by giving everyone the same opportunity to succeed.
            </p>
            
            <div className="space-y-2 text-lg font-bold text-foreground">
              <p>Prove your skills.</p>
              <p>Get qualified.</p>
              <p>Trade with simulated capital.</p>
            </div>
            
            <p className="text-foreground max-w-xl">
              At Kubera Markets, we're doing what others won't:<br />
              <span className="font-semibold">Empowering traders with transparent conditions and simulated funds.</span>
            </p>
            
            <div className="flex flex-wrap items-center gap-5">
              <Link to="/prop/login">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 py-6 rounded-full text-lg shadow-lg hover:shadow-[var(--glow-red)] transition-all"
                >
                  Get Started
                </Button>
              </Link>

              {/* Trustpilot badge */}
              <a
                href="https://www.trustpilot.com/review/kuberamarkets.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-0.5">
                  {stars.map((fill, i) => (
                    <TrustpilotStar key={i} fill={fill} />
                  ))}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground leading-tight">3.2</span>
                  <span className="text-xs text-muted-foreground leading-tight">Trustpilot</span>
                </div>
              </a>
            </div>
          </div>
          
          {/* Phone mockup */}
          <div className="relative order-2 lg:order-2 flex items-center justify-center">
            <PhoneMockup />
          </div>
        </div>
      </div>
      
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
    </section>
  );
};

export default PropHero;
