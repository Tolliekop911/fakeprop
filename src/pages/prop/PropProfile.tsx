import { useState, useEffect } from "react";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Mail, Phone, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PropProfile = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    tradingMarkets: "",
    tradingStyle: "",
    timezone: "",
    dateOfBirth: "",
    affiliateCode: "",
    referredBy: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Load from profiles table
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        const fn = (profileData as any)?.first_name || "";
        const ln = (profileData as any)?.last_name || "";
        const fullName = profileData?.full_name || user.user_metadata?.full_name || "";
        setProfile({
          firstName: fn || fullName.split(" ")[0] || "",
          lastName: ln || fullName.split(" ").slice(1).join(" ") || "",
          fullName: fullName,
          email: user.email || "",
          phone: (profileData as any)?.phone || "",
          address: (profileData as any)?.address || "",
          city: (profileData as any)?.city || "",
          state: (profileData as any)?.state || "",
          country: (profileData as any)?.country || "",
          zipCode: (profileData as any)?.zip_code || "",
          tradingMarkets: "",
          tradingStyle: "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          dateOfBirth: (profileData as any)?.date_of_birth || "",
          affiliateCode: (profileData as any)?.affiliate_code || "",
          referredBy: (profileData as any)?.referred_by || "",
        });
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const computedFullName = `${profile.firstName} ${profile.lastName}`.trim();
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: computedFullName }
      });
      if (authError) throw authError;

      // Update profiles table with all fields
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          full_name: computedFullName,
          first_name: profile.firstName,
          last_name: profile.lastName,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          zip_code: profile.zipCode,
          affiliate_code: profile.affiliateCode || null,
        } as any)
        .eq("user_id", user.id);
      if (profileError) throw profileError;

      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PropDashboardLayout title="Profile">
      <div className="max-w-4xl space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-primary" />
              </div>
              <div>
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-40 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold">{`${profile.firstName} ${profile.lastName}`.trim() || "Prop Trader"}</h2>
                    <p className="text-muted-foreground">Prop Trader</p>
                    <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      className="pl-10" 
                      value={profile.email}
                      disabled
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      type="tel" 
                      className="pl-10" 
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="address" 
                      className="pl-10" 
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      placeholder="Enter your address"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input 
                      id="dob" 
                      type="date"
                      value={profile.dateOfBirth}
                      disabled
                      className="opacity-60"
                    />
                    <p className="text-xs text-muted-foreground">Date of birth cannot be changed after signup.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="affiliateCode">Your Affiliate Code</Label>
                    <Input 
                      id="affiliateCode" 
                      value={profile.affiliateCode}
                      onChange={(e) => setProfile({ ...profile, affiliateCode: e.target.value })}
                      placeholder="Your personal affiliate code"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="referredBy">Referred By (Signup Referral Code)</Label>
                    <Input 
                      id="referredBy" 
                      value={profile.referredBy}
                      disabled
                      className="opacity-60"
                      placeholder="No referral code used"
                    />
                    <p className="text-xs text-muted-foreground">This is the referral code used when you signed up. It cannot be changed.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input 
                      id="city" 
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State / Region</Label>
                    <Input 
                      id="state" 
                      value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      placeholder="State or region"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input 
                      id="country" 
                      value={profile.country}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      placeholder="Country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">Zip Code</Label>
                    <Input 
                      id="zip" 
                      value={profile.zipCode}
                      onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })}
                      placeholder="Zip Code"
                    />
                  </div>
                </div>
                <Button 
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PropDashboardLayout>
  );
};

export default PropProfile;
