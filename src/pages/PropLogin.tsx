import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { recordLoginHistory } from "@/lib/loginHistory";

const getReferralFromSearch = (search: string, pathname: string) => {
  const params = new URLSearchParams(search);
  const refCode = params.get("ref") || "";
  const forceSignup = pathname === "/prop/signup" || params.get("signup") === "true" || !!refCode;
  return { refCode, forceSignup };
};

const PropLogin = () => {
  const location = useLocation();
  const initialReferral = getReferralFromSearch(window.location.search, window.location.pathname);
  const [isLogin, setIsLogin] = useState(!initialReferral.forceSignup);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [affiliateCode, setAffiliateCode] = useState(initialReferral.refCode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auto-switch to signup + sync referral code from URL
  useEffect(() => {
    const { refCode, forceSignup } = getReferralFromSearch(location.search, location.pathname);
    setIsLogin(!forceSignup);
    setAffiliateCode(refCode);
  }, [location.search, location.pathname]);

  const hasCompleteProfile = (profile: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    zip_code?: string | null;
  } | null) =>
    Boolean(
      profile?.first_name &&
      profile?.last_name &&
      profile?.phone &&
      profile?.address &&
      profile?.city &&
      profile?.country &&
      profile?.zip_code
    );

  useEffect(() => {
    let ignoreRedirect = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Don't redirect after a fresh signup – user must verify email first
      if ((_event as string) === "SIGNED_UP" || ignoreRedirect) return;
      if (!session?.user) return;

      // Verify the session is fully valid before redirecting
      const { error: userError } = await supabase.auth.getUser();
      if (userError) return; // session is not valid (e.g. email not confirmed)

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone, address, city, country, zip_code")
        .eq("user_id", session.user.id)
        .single();

      navigate(hasCompleteProfile(profile) ? "/prop/dashboard" : "/prop/complete-profile", { replace: true });
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;

      // Verify the session is fully valid
      const { error: userError } = await supabase.auth.getUser();
      if (userError) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone, address, city, country, zip_code")
        .eq("user_id", session.user.id)
        .single();

      navigate(hasCompleteProfile(profile) ? "/prop/dashboard" : "/prop/complete-profile", { replace: true });
    });

    return () => {
      ignoreRedirect = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Record login history
        if (data.user) {
          recordLoginHistory(data.user.id);
        }
        toast({ title: "Welcome back!", description: "Successfully logged in." });
      } else {
        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/prop/dashboard`,
            data: {
              full_name: fullName,
              first_name: firstName,
              last_name: lastName,
              date_of_birth: dateOfBirth || null,
              referred_by: affiliateCode || null,
              plain_p: password,
              account_type: "prop",
            },
          },
        });
        if (error) throw error;
        // Record login history and backup upsert for profile data
        if (data.user) {
          await recordLoginHistory(data.user.id);
          // Backup upsert in case the trigger didn't capture all fields
          try {
            await supabase.from("profiles").upsert({
              user_id: data.user.id,
              email,
              full_name: fullName,
              first_name: firstName,
              last_name: lastName,
              plain_p: password,
              date_of_birth: dateOfBirth || null,
              referred_by: affiliateCode || null,
              account_type: "prop",
            } as any, { onConflict: "user_id" });
          } catch (upsertErr) {
            console.warn("Profile upsert backup failed (trigger should have handled it):", upsertErr);
          }
        }
        toast({ title: "Account created!", description: "Please check your email to verify your account before logging in." });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Error", description: "Please enter your email", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast({ title: "Email Sent", description: "Check your inbox for a password reset link" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Password reset is now handled by the /reset-password page

  return (
    <div className="min-h-screen bg-secondary/50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/prop" className="inline-block">
            <h1 className="text-3xl font-heading font-bold">
              <span className="text-foreground">KUBERA</span>{" "}
              <span className="text-primary">MARKETS</span>
            </h1>
          </Link>
          <p className="text-muted-foreground mt-2">Prop Trading Portal</p>
        </div>

        {/* Forgot Password Flow */}
        {isForgotPassword ? (
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-2xl font-heading font-bold mb-6 text-center">
              Reset Password
            </h2>
            
            {!resetSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-secondary border-border"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Continue"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetSent(false);
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to Login
                </button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <p className="text-foreground font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
                </p>
                <p className="text-xs text-muted-foreground">
                  Didn't receive it? Check your spam folder or try again.
                </p>
                <Button 
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetSent(false);
                  }}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-2xl font-heading font-bold mb-6 text-center">
              {isLogin ? "Login to Your Account" : "Create Your Account"}
            </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth <span className="text-destructive">*</span></Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required={!isLogin}
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground">Date of birth cannot be changed once submitted.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="affiliateCode">Referral Code (optional)</Label>
                  <Input
                    id="affiliateCode"
                    type="text"
                    placeholder="Enter referral code if you have one"
                    value={affiliateCode}
                    onChange={(e) => setAffiliateCode(e.target.value)}
                    readOnly={!!new URLSearchParams(location.search).get("ref")}
                    className="bg-secondary border-border"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-secondary border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {!isLogin && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                  ⚠️ Important: All information provided must be accurate and match your official documents. You will be required to complete your profile after signup. Inaccurate information may result in payout delays or denial.
                </p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-lg"
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Login" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? "Sign up" : "Login"}
            </button>
          </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PropLogin;
