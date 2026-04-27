import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Percent, Zap, TrendingUp, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Affiliates = () => {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
    address: "",
    city: "",
    stateRegion: "",
    country: "",
    zipCode: "",
    company: "",
    website: "",
    promotionPlan: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.telephone || !formData.address || !formData.city || !formData.country) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("affiliate_applications" as any).insert([{
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        telephone: formData.telephone,
        address: formData.address,
        city: formData.city,
        state_region: formData.stateRegion || null,
        country: formData.country,
        zip_code: formData.zipCode || null,
        company: formData.company || null,
        website: formData.website || null,
        promotion_plan: formData.promotionPlan || null,
      }]);
      if (error) throw error;
      setIsSubmitted(true);
      toast({
        title: "Application Submitted!",
        description: "Thank you for your interest in our affiliate program.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const benefits = [
    {
      icon: Percent,
      title: "Earn up to 20% Commission",
      description: "You receive a commission for each referred trader. Scaling commissions starting from 10%"
    },
    {
      icon: Zap,
      title: "Instant Payouts",
      description: "Request your affiliate commission anytime"
    },
    {
      icon: TrendingUp,
      title: "Unlimited Income",
      description: "The more traders you refer the more commission you make without any limits"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-background">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-heading font-bold text-foreground mb-6">
            AFFILIATES
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Participate in our Affiliate Program. Whether you are a trading influencer, educator, or
            group administrator, recommending Kubera can generate substantial income!
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="relative bg-card border border-border/30 rounded-2xl p-8 overflow-hidden group hover:scale-105 transition-transform"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/40" />
                <div className="relative z-10 text-center">
                  <benefit.icon className="w-12 h-12 text-primary mx-auto mb-6" />
                  <h3 className="text-2xl font-heading font-bold text-foreground mb-4">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6 max-w-4xl">
          {isSubmitted ? (
            <div className="text-center py-16 space-y-6">
              <CheckCircle className="w-20 h-20 text-primary mx-auto" />
              <h2 className="text-3xl font-heading font-bold text-foreground">Thank You!</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Your affiliate application has been submitted successfully. Our team will review your application and get back to you shortly.
              </p>
              <Button 
                onClick={() => {
                  setIsSubmitted(false);
                  setFormData({
                    firstName: "", lastName: "", email: "", telephone: "",
                    address: "", city: "", stateRegion: "", country: "",
                    zipCode: "", company: "", website: "", promotionPlan: "",
                  });
                }}
                variant="outline"
                className="mt-4"
              >
                Submit Another Application
              </Button>
            </div>
          ) : (
            <>
              <p className="text-center text-muted-foreground mb-10">
                Please fill out the form provided below to enter our affiliate program portal. Inside, you will discover
                your customized affiliate links, tracking metrics, and a variety of affiliate marketing materials.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-foreground">First Name <span className="text-destructive">*</span></Label>
                    <Input id="firstName" name="firstName" placeholder="Enter your first name" value={formData.firstName} onChange={handleChange} className="bg-card border-border h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-foreground">Last Name <span className="text-destructive">*</span></Label>
                    <Input id="lastName" name="lastName" placeholder="Enter your last name" value={formData.lastName} onChange={handleChange} className="bg-card border-border h-12" />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email <span className="text-destructive">*</span></Label>
                    <Input id="email" name="email" type="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} className="bg-card border-border h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telephone" className="text-foreground">Telephone <span className="text-destructive">*</span></Label>
                    <Input id="telephone" name="telephone" placeholder="Enter your phone number" value={formData.telephone} onChange={handleChange} className="bg-card border-border h-12" />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-foreground">Address <span className="text-destructive">*</span></Label>
                    <Input id="address" name="address" placeholder="Enter your address" value={formData.address} onChange={handleChange} className="bg-card border-border h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-foreground">City <span className="text-destructive">*</span></Label>
                    <Input id="city" name="city" placeholder="Enter your city" value={formData.city} onChange={handleChange} className="bg-card border-border h-12" />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stateRegion" className="text-foreground">State or Region</Label>
                    <Input id="stateRegion" name="stateRegion" placeholder="Enter your state or region" value={formData.stateRegion} onChange={handleChange} className="bg-card border-border h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-foreground">Country <span className="text-destructive">*</span></Label>
                    <Input id="country" name="country" placeholder="Enter your country" value={formData.country} onChange={handleChange} className="bg-card border-border h-12" />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-foreground">Zip Code</Label>
                    <Input id="zipCode" name="zipCode" placeholder="Enter your zip code" value={formData.zipCode} onChange={handleChange} className="bg-card border-border h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-foreground">Company (Optional)</Label>
                    <Input id="company" name="company" placeholder="Enter your company name" value={formData.company} onChange={handleChange} className="bg-card border-border h-12" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-foreground">Website or Social Media Page (Optional)</Label>
                  <Input id="website" name="website" placeholder="Enter your website or social media URL" value={formData.website} onChange={handleChange} className="bg-card border-border h-12" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="promotionPlan" className="text-foreground">How Will You Promote Us?</Label>
                  <Textarea id="promotionPlan" name="promotionPlan" placeholder="Describe your promotion plan" value={formData.promotionPlan} onChange={handleChange} className="bg-card border-border min-h-[120px] resize-none" />
                </div>
                
                <Button 
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 py-3 h-auto"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</> : "Register"}
                </Button>
              </form>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Affiliates;