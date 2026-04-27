import { useState, useEffect, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Shield, Key, Smartphone, Monitor, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LoginEntry {
  id: string;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  created_at: string;
  status: string;
}

const PropSecurity = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  useEffect(() => {
    const loadLoginHistory = async () => {
      setHistoryLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("login_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!error && data) {
          setLoginHistory(data);
        }
      }
      setHistoryLoading(false);
    };
    loadLoginHistory();
  }, []);

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (passwords.new.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.new });
      if (error) throw error;
      // Update plain_p in profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ plain_p: passwords.new } as any).eq("user_id", user.id);
      }
      toast({ title: "Success", description: "Password updated successfully" });
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const maskIP = (ip: string | null) => {
    if (!ip) return "Unknown";
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return ip;
  };

  return (
    <PropDashboardLayout title="Security">
      <div className="max-w-4xl space-y-6">
        {/* Password Change */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>Update your password regularly to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input 
                id="currentPassword" 
                type="password" 
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword" 
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input 
                id="confirmPassword" 
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              />
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={handlePasswordChange}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>

        {/* Login History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              <CardTitle>Login History</CardTitle>
            </div>
            <CardDescription>Recent login activity on your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historyLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-muted rounded" />
                      <div>
                        <div className="h-4 w-24 bg-muted rounded mb-1" />
                        <div className="h-3 w-16 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="h-4 w-20 bg-muted rounded" />
                  </div>
                ))
              ) : loginHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No login history available</p>
                </div>
              ) : (
                loginHistory.map((login) => (
                  <div key={login.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {login.browser || "Unknown Browser"} / {login.os || "Unknown OS"}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {maskIP(login.ip_address)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{formatDate(login.created_at)}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        login.status === "success" 
                          ? "bg-green-500/10 text-green-500" 
                          : "bg-red-500/10 text-red-500"
                      }`}>
                        {login.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Your account will be permanently deactivated and you will be logged out.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (user) {
                            await supabase.from("profiles").update({ account_type: "deleted" } as any).eq("user_id", user.id);
                          }
                          await supabase.auth.signOut();
                          toast({ title: "Account Deleted", description: "Your account has been deleted." });
                        } catch (err: any) {
                          toast({ title: "Error", description: err.message, variant: "destructive" });
                        }
                      }}
                    >
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

      </div>
    </PropDashboardLayout>
  );
};

export default PropSecurity;
