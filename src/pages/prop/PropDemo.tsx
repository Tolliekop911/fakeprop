import { useState, useEffect } from "react";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Monitor, CheckCircle, Loader2, History } from "lucide-react";
import { format } from "date-fns";

const ACCOUNT_SIZES = [5000, 10000, 25000, 50000, 100000, 200000];

interface DemoAccount {
  id: string;
  account_size: number;
  api_response: Record<string, unknown> | null;
  created_at: string;
}

const PropDemo = () => {
  const [accountSize, setAccountSize] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const { toast } = useToast();

  const fetchDemoAccounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("demo_accounts" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDemoAccounts(data as unknown as DemoAccount[]);
    }
    setLoadingAccounts(false);
  };

  useEffect(() => {
    fetchDemoAccounts();
  }, []);

  const handleRequestDemo = async () => {
    if (!accountSize) {
      toast({ title: "Select an account size", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Please log in again", variant: "destructive" });
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const functionUrl = supabaseUrl
        ? `${supabaseUrl}/functions/v1/create-demo-account`
        : `https://${projectId}.supabase.co/functions/v1/create-demo-account`;

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ accountSize: Number(accountSize) }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create demo account");
      }

      setResult(data.data);
      toast({ title: "Demo account created successfully!" });
      fetchDemoAccounts();
    } catch (err: any) {
      console.error("Demo request error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderAccountDetails = (details: Record<string, unknown> | null) => {
    if (!details || typeof details !== "object") return null;
    return (
      <div className="space-y-1">
        {Object.entries(details).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground capitalize">
              {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
            </span>
            <span className="font-mono font-medium text-foreground text-right max-w-[60%] truncate">
              {String(value ?? "")}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <PropDashboardLayout title="Demo Account">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              Request a Demo Account
            </CardTitle>
            <CardDescription>
              Get a free practice account to test your strategies with virtual funds. No risk involved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Account Size</label>
              <Select value={accountSize} onValueChange={setAccountSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account size" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      ${size.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleRequestDemo}
              disabled={loading || !accountSize}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Demo Account...
                </>
              ) : (
                "Request Demo Account"
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <CheckCircle className="w-5 h-5" />
                Demo Account Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {typeof result === "object" && result !== null ? (
                  <div className="bg-secondary/50 rounded-lg p-4">
                    {renderAccountDetails(result)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{String(result)}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Please save your credentials. You can download the trading platform from the{" "}
                  <a href="/faq/downloads" className="text-primary underline">Downloads</a> page.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Demo Accounts */}
        <Card className="border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              My Demo Accounts
            </CardTitle>
            <CardDescription>
              All your previously created demo accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : demoAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No demo accounts yet. Request one above to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {demoAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="bg-secondary/50 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-foreground">
                        ${account.account_size.toLocaleString()} Account
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(account.created_at), "MMM dd, yyyy HH:mm")}
                      </span>
                    </div>
                    {account.api_response && renderAccountDetails(account.api_response)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PropDashboardLayout>
  );
};

export default PropDemo;
