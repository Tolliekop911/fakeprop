import Navigation from "@/components/Navigation";
import { useState, useMemo, useEffect } from "react";
import { Search, ChevronDown, ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQChallenge = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFaqs = async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("question, answer")
        .eq("category", "challenge")
        .eq("is_active", true)
        .order("sort_order");

      if (!error && data) {
        setFaqItems(data.map(d => ({ question: d.question, answer: d.answer })));
      }
      setLoading(false);
    };
    fetchFaqs();
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return faqItems;
    const query = searchQuery.toLowerCase();
    return faqItems.filter(
      item =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
    );
  }, [searchQuery, faqItems]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <Link 
            to="/faq" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to FAQ
          </Link>

          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
              Challenge / Funded
            </h1>
            <p className="text-muted-foreground">
              Everything you need to know about our prop trading program
            </p>
          </div>

          <div className="relative mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-5 text-base bg-card/50 border-border/30 rounded-xl focus:ring-2 focus:ring-primary/50"
            />
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item, index) => (
                <div 
                  key={index}
                  className="rounded-xl overflow-hidden border border-border/20 bg-card/30"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/10 transition-colors"
                  >
                    <span className="font-medium text-foreground pr-4">
                      {item.question}
                    </span>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                      openIndex === index ? "bg-primary" : "bg-muted/30"
                    )}>
                      <ChevronDown 
                        className={cn(
                          "w-4 h-4 transition-transform",
                          openIndex === index ? "rotate-180 text-primary-foreground" : "text-muted-foreground"
                        )}
                      />
                    </div>
                  </button>
                  
                  <div className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}>
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 pt-0">
                        <p className="text-muted-foreground leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No questions found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default FAQChallenge;
