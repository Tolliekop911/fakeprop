import { useState, useMemo, useEffect } from "react";
import { Search, ArrowRight, Shield, Monitor, Trophy, Download, ChevronDown, Loader2, ArrowLeft, Smartphone, Apple, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";

interface FAQItem {
  question: string;
  answer: string;
}

const faqCategories = [
  {
    title: "Account / Security",
    description: "Account setup, login, password reset and security settings",
    icon: Shield,
    subCategory: "account-security",
  },
  {
    title: "Platform / Trading",
    description: "Using the Condor platform, placing trades, instruments, and trading hours",
    icon: Monitor,
    subCategory: "platform-trading",
  },
  {
    title: "Challenge / Funded",
    description: "Everything about our prop trading evaluation program and funded accounts",
    icon: Trophy,
    subCategory: "challenge",
  },
  {
    title: "Condor Downloads",
    description: "Download and access the Condor trading platform on all your devices",
    icon: Download,
    subCategory: "downloads",
  },
];

const PropFaq = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredCategories = faqCategories.filter(
    (cat) =>
      !searchQuery.trim() ||
      cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!selectedCategory) return;
    setLoading(true);
    const fetchFaqs = async () => {
      const cat = faqCategories.find((c) => c.subCategory === selectedCategory);
      const category = selectedCategory === "challenge" ? "challenge" : "general";
      
      let query = supabase
        .from("faqs")
        .select("question, answer")
        .eq("category", category)
        .eq("is_active", true)
        .order("sort_order");

      if (selectedCategory !== "challenge") {
        query = query.eq("sub_category", selectedCategory);
      }

      const { data, error } = await query;
      if (!error && data) {
        setFaqItems(data.map((d) => ({ question: d.question, answer: d.answer })));
      }
      setLoading(false);
    };
    fetchFaqs();
  }, [selectedCategory]);

  // Condor Downloads view
  if (selectedCategory === "downloads") {
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
      <PropDashboardLayout title="FAQ">
        <div className="max-w-3xl mx-auto space-y-6">
          <button
            onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to FAQ
          </button>

          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-1">Condor Downloads</h2>
            <p className="text-muted-foreground text-sm">Access the Condor trading platform on your preferred device</p>
          </div>

          <div className="grid gap-6">
            {platforms.map((platform, index) => {
              const Icon = platform.icon;
              return (
                <Card key={index} className="border-border/30">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{platform.title}</CardTitle>
                        <CardDescription className="mt-1">{platform.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {platform.available ? (
                      <a href={platform.link} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full sm:w-auto">
                          {platform.linkText}
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </a>
                    ) : (
                      <Button disabled className="w-full sm:w-auto">{platform.linkText}</Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="p-6 rounded-2xl border border-border/30 bg-card/20">
            <h3 className="text-lg font-semibold text-foreground mb-2">System Requirements</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• <strong>Web Platform:</strong> Any modern browser (Chrome, Firefox, Safari, Edge)</li>
              <li>• <strong>Android:</strong> Android 8.0 or higher</li>
              <li>• <strong>iOS:</strong> iOS 14.0 or higher (when available)</li>
            </ul>
          </div>
        </div>
      </PropDashboardLayout>
    );
  }

  // Sub-page view (FAQ items)
  if (selectedCategory) {
    const cat = faqCategories.find((c) => c.subCategory === selectedCategory);
    const filteredItems = faqItems.filter(
      (item) =>
        !searchQuery.trim() ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <PropDashboardLayout title="FAQ">
        <div className="max-w-3xl mx-auto space-y-6">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSearchQuery("");
              setOpenIndex(null);
            }}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to FAQ
          </button>

          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-1">{cat?.title}</h2>
            <p className="text-muted-foreground text-sm">{cat?.description}</p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOpenIndex(null);
              }}
              className="pl-12 pr-4 py-5 text-base bg-card/50 border-border/30 rounded-xl focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {searchQuery ? `No questions found matching "${searchQuery}"` : "No questions available yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item, index) => (
                <div key={index} className="rounded-xl overflow-hidden border border-border/20 bg-card/30">
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/10 transition-colors"
                  >
                    <span className="font-medium text-foreground pr-4">{item.question}</span>
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                        openIndex === index ? "bg-primary" : "bg-muted/30"
                      )}
                    >
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform",
                          openIndex === index ? "rotate-180 text-primary-foreground" : "text-muted-foreground"
                        )}
                      />
                    </div>
                  </button>
                  <div className={cn("grid transition-all duration-300 ease-in-out", openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 pt-0">
                        <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PropDashboardLayout>
    );
  }

  // Category overview
  return (
    <PropDashboardLayout title="FAQ">
      <div className="max-w-5xl mx-auto space-y-8">
        <Link
          to="/prop/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="text-center">
          <h2 className="text-3xl font-heading font-bold text-foreground mb-2">
            How can we <span className="text-primary">help</span> you?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Find answers to frequently asked questions about our trading platform and prop programs
          </p>

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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedCategory(category.subCategory);
                setSearchQuery("");
              }}
              className="group block p-8 rounded-3xl border border-border/30 bg-card/30 hover:bg-card/60 hover:border-primary/50 transition-all duration-300 text-left"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <category.icon className="w-7 h-7 text-primary" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-heading font-bold text-foreground mb-2">{category.title}</h3>
              <p className="text-muted-foreground text-sm">{category.description}</p>
            </button>
          ))}
        </div>

        <div className="text-center p-8 rounded-3xl border border-border/30 bg-card/20">
          <h3 className="text-xl font-heading font-semibold text-foreground mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-4">Our support team is here to help you 24/5</p>
          <Link to="/prop/contact" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
            Contact Support
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PropDashboardLayout>
  );
};

export default PropFaq;
