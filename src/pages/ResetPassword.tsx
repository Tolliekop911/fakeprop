import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lock, CheckCircle, Loader2 } from "lucide-react";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check URL hash for recovery type
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setSuccess(true);
      toast({ title: "Password Updated", description: "Your password has been reset successfully" });
      
      // Redirect to dashboard after a short delay
      setTimeout(() => navigate("/prop/dashboard"), 2000);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground">Kubera Markets</h1>
          <p className="text-sm text-muted-foreground">Prop Trading Portal</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            {success ? (
              <>
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <CardTitle>Password Reset Successful</CardTitle>
                <CardDescription>Redirecting you to the dashboard...</CardDescription>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Set New Password</CardTitle>
                <CardDescription>Enter your new password below</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {!success && (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-secondary border-border"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            )}

            <button
              type="button"
              onClick={() => navigate("/prop/login")}
              className="w-full text-sm text-muted-foreground hover:text-foreground mt-4 text-center block"
            >
              ← Back to Login
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
