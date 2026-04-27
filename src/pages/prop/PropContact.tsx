import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2 } from "lucide-react";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";

const PropContact = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    city: "",
    country: "",
    email: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: dbError } = await supabase.from("contact_submissions").insert([{
        first_name: formData.firstName,
        last_name: formData.lastName,
        city: formData.city || null,
        country: formData.country || null,
        email: formData.email,
        message: formData.message,
      }]);
      if (dbError) throw dbError;
      setSubmitted(true);
    } catch (err: any) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <PropDashboardLayout title="Contact Support">
      <div className="max-w-2xl mx-auto">
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-heading font-bold">Thank you for your message!</h2>
            <p className="text-muted-foreground max-w-sm">
              Someone will be with you shortly. We typically respond within 24 hours.
            </p>
            <Button
              variant="outline"
              onClick={() => { setSubmitted(false); setFormData({ firstName: "", lastName: "", city: "", country: "", email: "", message: "" }); }}
            >
              Send another message
            </Button>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-8">
              We are dedicated to enhancing your trading journey. Please fill out the form to send us your inquiry, and we'll get back to you as soon as possible.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">First Name <span className="text-primary">*</span></label>
                  <Input name="firstName" placeholder="Enter your first name" value={formData.firstName} onChange={handleChange} className="bg-card border-border h-12" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Last Name <span className="text-primary">*</span></label>
                  <Input name="lastName" placeholder="Enter your last name" value={formData.lastName} onChange={handleChange} className="bg-card border-border h-12" required />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">City</label>
                  <Input name="city" placeholder="Enter your city" value={formData.city} onChange={handleChange} className="bg-card border-border h-12" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Country</label>
                  <Input name="country" placeholder="Enter your country" value={formData.country} onChange={handleChange} className="bg-card border-border h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Email <span className="text-primary">*</span></label>
                <Input name="email" type="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} className="bg-card border-border h-12" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Message <span className="text-primary">*</span></label>
                <Textarea name="message" placeholder="How can we help you?" value={formData.message} onChange={handleChange} className="bg-card border-border min-h-[150px] resize-none" required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 py-3 h-auto rounded-full">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</> : "Submit"}
              </Button>
            </form>
          </>
        )}
      </div>
    </PropDashboardLayout>
  );
};

export default PropContact;
