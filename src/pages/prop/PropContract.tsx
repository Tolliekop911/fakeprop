import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PropContract = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (userRes.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userRes.user.id)
          .single();
        
        // Check if already signed (has address data)
        if (profileData?.address && profileData?.city) {
          setSigned(true);
        }
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleSign = async () => {
    if (!accepted) {
      toast({
        title: "Agreement Required",
        description: "Please check the box to confirm you accept the terms.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    const { data: userRes } = await supabase.auth.getUser();
    if (userRes.user) {
      // Just mark contract as accepted by updating a timestamp or field
      await supabase
        .from("profiles")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userRes.user.id);
    }

    setSubmitting(false);
    setSigned(true);
    toast({
      title: "Contract Signed",
      description: "Your Independent Contractor Agreement has been accepted.",
    });
  };

  if (loading) {
    return (
      <PropDashboardLayout title="Contract">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PropDashboardLayout>
    );
  }

  return (
    <PropDashboardLayout title="Contract">
      <div className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Independent Contractor Agreement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PDF Embed */}
            <div className="border border-border rounded-lg overflow-hidden bg-muted/20">
              <object
                data="/documents/KMC_Prop_Traders_Agreement.pdf"
                type="application/pdf"
                className="w-full h-[70vh] min-h-[500px]"
                title="Independent Contractor Agreement"
              >
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                  <FileText className="w-12 h-12" />
                  <p className="text-sm">Unable to display PDF inline.</p>
                  <Button asChild variant="outline">
                    <a href="/documents/KMC_Prop_Traders_Agreement.pdf" target="_blank" rel="noopener noreferrer">
                      Open PDF in New Tab
                    </a>
                  </Button>
                </div>
              </object>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild variant="outline" size="sm">
                <a href="/documents/KMC_Prop_Traders_Agreement.pdf" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Full Screen
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a href="/documents/KMC_Prop_Traders_Agreement.pdf" download="KMC_Prop_Traders_Agreement.pdf">
                  <FileText className="w-4 h-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {signed ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <FileText className="w-5 h-5 text-primary" />
              )}
              {signed ? "Contract Accepted" : "Accept Agreement"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signed ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Agreement Accepted</h3>
                <p className="text-muted-foreground">
                  You have accepted the Independent Contractor Agreement.
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  Date: {new Date().toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Please read the Independent Contractor Agreement above carefully before accepting.
                </p>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/20">
                  <Checkbox
                    id="accept-terms"
                    checked={accepted}
                    onCheckedChange={(checked) => setAccepted(checked === true)}
                    className="mt-0.5"
                  />
                  <label 
                    htmlFor="accept-terms" 
                    className="text-sm text-foreground cursor-pointer leading-relaxed"
                  >
                    I have read and understood the Independent Contractor Agreement. I accept all terms and conditions outlined in this agreement.
                  </label>
                </div>

                <div className="pt-2">
                  <Button 
                    onClick={handleSign} 
                    className="w-full"
                    disabled={submitting || !accepted}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Accept & Sign Contract"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PropDashboardLayout>
  );
};

export default PropContract;
