import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowLeft, Monitor, Smartphone, Apple, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CondorDownloads = () => {
  const platforms = [
    {
      title: "Condor Web Platform",
      description: "Trade directly from your browser with our full-featured web trading platform. No download required.",
      icon: Monitor,
      link: "https://webtrader-kubera.condor-fx.com",
      linkText: "Open Web Platform",
      available: true,
    },
    {
      title: "Condor Android App",
      description: "Download the Condor trading app for Android devices from the Google Play Store.",
      icon: Smartphone,
      link: "https://webtrader-kubera.condor-fx.com",
      linkText: "Download for Android",
      available: true,
    },
    {
      title: "Condor iOS App",
      description: "The iOS version of Condor trading app is currently in development.",
      icon: Apple,
      linkText: "Coming Soon",
      available: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Back Link */}
          <Link 
            to="/faq" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to FAQ
          </Link>

          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
              Condor <span className="text-primary">Downloads</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Access the Condor trading platform on your preferred device
            </p>
          </div>

          <div className="grid gap-6">
            {platforms.map((platform, index) => {
              const Icon = platform.icon;
              return (
                <Card key={index} className="border-border/30">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <Icon className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{platform.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {platform.description}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {platform.available ? (
                      <a 
                        href={platform.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="w-full sm:w-auto">
                          {platform.linkText}
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </a>
                    ) : (
                      <Button disabled className="w-full sm:w-auto">
                        {platform.linkText}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Additional Info */}
          <div className="mt-12 p-6 rounded-2xl border border-border/30 bg-card/20">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              System Requirements
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• <strong>Web Platform:</strong> Any modern browser (Chrome, Firefox, Safari, Edge)</li>
              <li>• <strong>Android:</strong> Android 8.0 or higher</li>
              <li>• <strong>iOS:</strong> iOS 14.0 or higher (when available)</li>
            </ul>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default CondorDownloads;
