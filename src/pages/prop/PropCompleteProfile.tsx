import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PropCompleteProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
  });

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        let activeSession = initialSession;

        if (!activeSession?.user) {
          const { data: refreshedData } = await supabase.auth.refreshSession();
          activeSession = refreshedData.session ?? null;
        }

        if (!activeSession?.user) {
          navigate("/prop/login", { replace: true });
          return;
        }

        const user = activeSession.user;
        const fullName = user.user_metadata?.full_name || "";

        const fetchProfile = async () =>
          supabase
            .from("profiles")
            .select("first_name, last_name, phone, address, city, country, zip_code, state")
            .eq("user_id", user.id)
            .maybeSingle();

        let { data: profile, error: profileError } = await fetchProfile();

        const authRelatedProfileError =
          profileError && /(jwt|token|auth|401|expired)/i.test(profileError.message ?? "");

        if (authRelatedProfileError) {
          const { data: refreshedData } = await supabase.auth.refreshSession();
          if (refreshedData.session?.user) {
            const retry = await fetchProfile();
            profile = retry.data;
            profileError = retry.error;
          }
        }

        if (profileError) {
          console.error("Profile preload failed", profileError);
        }

        if (profile?.first_name && profile?.last_name && profile?.phone && profile?.address && profile?.city && profile?.country && profile?.zip_code) {
          navigate("/prop/dashboard", { replace: true });
          return;
        }

        setForm((prev) => ({
          ...prev,
          firstName: profile?.first_name || fullName.split(" ")[0] || "",
          lastName: profile?.last_name || fullName.split(" ").slice(1).join(" ") || "",
          phone: profile?.phone || "",
          address: profile?.address || "",
          city: profile?.city || "",
          state: profile?.state || "",
          country: profile?.country || "",
          zipCode: profile?.zip_code || "",
        }));
      } catch (error) {
        console.error("Profile initialization failed", error);
        // For new accounts, just show the empty form instead of redirecting
        // Only redirect if we truly have no session at all
        const { data: { session: lastCheck } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (!lastCheck?.user) {
          toast({
            title: "Error",
            description: "Unable to load your profile. Please log in again.",
            variant: "destructive",
          });
          navigate("/prop/login", { replace: true });
        }
      } finally {
        setChecking(false);
      }
    };

    checkProfile();
  }, [navigate, toast]);

  const isAuthError = (error: unknown) =>
    error instanceof Error &&
    /(session|jwt|token|auth|401|invalid authentication credentials|refresh token)/i.test(
      error.message,
    );

  const getErrorMessage = (error: unknown) => {
    if (error instanceof TypeError || (error instanceof Error && /Failed to fetch/i.test(error.message))) {
      return "Connection issue while saving your profile. Please refresh and try again.";
    }

    if (isAuthError(error)) {
      return "Your session changed while saving. Please sign in again and retry.";
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Something went wrong. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.firstName || !form.lastName || !form.phone || !form.address || !form.city || !form.country || !form.zipCode) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      let userId = initialSession?.user?.id;

      if (!userId) {
        const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedData.session?.user?.id) {
          throw new Error("Session expired. Please log in again.");
        }

        userId = refreshedData.session.user.id;
      }

      const computedFullName = `${form.firstName} ${form.lastName}`.trim();
      const profilePayload = {
        user_id: userId,
        first_name: form.firstName,
        last_name: form.lastName,
        full_name: computedFullName,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        zip_code: form.zipCode,
      };

      let saveError: Error | null = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const { error } = await supabase
          .from("profiles")
          .upsert(profilePayload, { onConflict: "user_id" });

        if (!error) {
          saveError = null;
          break;
        }

        if (attempt === 0 && isAuthError(error)) {
          const {
            data: { session: recoveredSession },
          } = await supabase.auth.getSession();

          if (recoveredSession?.user?.id) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            continue;
          }

          const { data: refreshedData } = await supabase.auth.refreshSession();
          if (refreshedData.session?.user?.id) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            continue;
          }
        }

        saveError = error;
        break;
      }

      if (saveError) {
        throw saveError;
      }

      toast({ title: "Profile Complete", description: "Welcome to Kubera Markets!" });
      navigate("/prop/dashboard", { replace: true });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });

      if (isAuthError(error)) {
        navigate("/prop/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-secondary/50 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/prop" className="inline-block">
            <h1 className="text-3xl font-heading font-bold">
              <span className="text-foreground">KUBERA</span>{" "}
              <span className="text-primary">MARKETS</span>
            </h1>
          </Link>
          <p className="text-muted-foreground mt-2">Complete Your Profile</p>
          <p className="text-sm text-muted-foreground mt-1">Please fill in your details to get started.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-2xl font-heading font-bold mb-6 text-center">Your Details</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                  className="bg-secondary border-border"
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                  className="bg-secondary border-border"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                className="bg-secondary border-border"
                placeholder="+1 234 567 890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
                className="bg-secondary border-border"
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                  className="bg-secondary border-border"
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State / Region</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="bg-secondary border-border"
                  placeholder="State or region"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  required
                  className="bg-secondary border-border"
                  placeholder="Country"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code <span className="text-destructive">*</span></Label>
                <Input
                  id="zipCode"
                  value={form.zipCode}
                  onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                  required
                  className="bg-secondary border-border"
                  placeholder="Zip code"
                />
              </div>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                ⚠️ Important: All information provided must be accurate and match your official documents. Inaccurate information may result in payout delays or denial.
              </p>
            </div>

            <Button type="submit" className="w-full py-6 font-semibold" disabled={loading}>
              {loading ? "Saving..." : "Complete Profile & Continue"}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PropCompleteProfile;
