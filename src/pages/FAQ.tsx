import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Search, ArrowRight, ArrowLeft, Shield, Monitor, Trophy, Download } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const faqCategories = [
    {
      title: "Account / Security",
      description: "Account setup, login, password reset and security settings",
      icon: Shield,
      link: "/faq/account-security",
      topics: ["Account Setup", "Password Reset", "Security Settings"]
    },
    {
      title: "Platform / Trading",
      description: "Using the Condor platform, placing trades, instruments, and trading hours",
      icon: Monitor,
      link: "/faq/platform-trading",
      topics: ["Condor Platform", "Order Types", "Instruments", "Trading Hours"]
    },
    {
      title: "Challenge / Funded",
      description: "Everything about our prop trading evaluation program and funded accounts",
      icon: Trophy,
      link: "/faq/challenge",
      topics: ["Evaluation Rules", "Trading Rules", "Payouts & Scaling", "Funded Accounts"]
    },
    {
      title: "Condor Downloads",
      description: "Download and access the Condor trading platform on all your devices",
      icon: Download,
      link: "/faq/downloads",
      topics: ["Web Platform", "Android App", "iOS App"]
    }
  ];

  const filtered = faqCategories.filter(cat =>
    !searchQuery.trim() ||
    cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.topics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-4">
              How can we <span className="text-primary">help</span> you?
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10">
              Find answers to frequently asked questions about our trading platform and prop programs
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 pr-5 py-7 text-base bg-card border-border/50 rounded-2xl focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Category Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((category, index) => (
              <Link
                key={index}
                to={category.link}
                className="group block p-8 rounded-3xl border border-border/30 bg-card/30 hover:bg-card/60 hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <category.icon className="w-7 h-7 text-primary" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                
                <h2 className="text-xl font-heading font-bold text-foreground mb-2">
                  {category.title}
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  {category.description}
                </p>
                
              </Link>
            ))}
          </div>

          {/* Contact Support */}
          <div className="mt-16 text-center p-8 rounded-3xl border border-border/30 bg-card/20">
            <h3 className="text-xl font-heading font-semibold text-foreground mb-2">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-4">
              Our support team is here to help you 24/5
            </p>
            <Link 
              to="/contact"
              className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
            >
              Contact Support
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default FAQ;
