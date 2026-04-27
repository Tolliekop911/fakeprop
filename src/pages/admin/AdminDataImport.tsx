import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  Users,
  Trophy,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const AdminDataImport = () => {
  const [activeTab, setActiveTab] = useState("accounts");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }

    return rows;
  };

  const importAccounts = async (rows: Record<string, string>[]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of rows) {
      try {
        // Find user by email
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", row.user_email)
          .single();

        if (!profile) {
          result.errors.push(`User not found: ${row.user_email}`);
          result.failed++;
          continue;
        }

        const { error } = await supabase.from("accounts").insert({
          user_id: profile.user_id,
          account_number: row.account_number || `PROP-${Date.now()}`,
          account_size: parseFloat(row.account_size) || 0,
          balance: parseFloat(row.balance) || parseFloat(row.account_size) || 0,
          equity: parseFloat(row.equity) || parseFloat(row.balance) || 0,
          leverage: row.leverage || "1:30",
          status: row.status || "active",
          phase: row.phase || "phase1",
          program_type: row.program_type || "1-step",
          account_type: row.account_type || "prop",
        });

        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.errors.push(`Row error: ${error.message}`);
        result.failed++;
      }
    }

    return result;
  };

  const importChallenges = async (rows: Record<string, string>[]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of rows) {
      try {
        // Find user and account
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", row.user_email)
          .single();

        if (!profile) {
          result.errors.push(`User not found: ${row.user_email}`);
          result.failed++;
          continue;
        }

        const { data: account } = await supabase
          .from("accounts")
          .select("id")
          .eq("account_number", row.account_number)
          .single();

        if (!account) {
          result.errors.push(`Account not found: ${row.account_number}`);
          result.failed++;
          continue;
        }

        const accountSize = parseFloat(row.account_size) || 50000;

        const { error } = await supabase.from("challenges").insert({
          user_id: profile.user_id,
          account_id: account.id,
          challenge_number: row.challenge_number || `CH-${Date.now()}`,
          account_size: accountSize,
          current_balance: parseFloat(row.current_balance) || accountSize,
          profit_target_percent: parseFloat(row.profit_target_percent) || 8,
          profit_target_amount: (accountSize * (parseFloat(row.profit_target_percent) || 8)) / 100,
          max_drawdown_percent: parseFloat(row.max_drawdown_percent) || 10,
          max_drawdown_amount: (accountSize * (parseFloat(row.max_drawdown_percent) || 10)) / 100,
          phase: row.phase || "phase1",
          status: row.status || "active",
          program_type: row.program_type || "1-step",
          days_traded: parseInt(row.days_traded) || 0,
          min_trading_days: parseInt(row.min_trading_days) || 2,
        });

        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.errors.push(`Row error: ${error.message}`);
        result.failed++;
      }
    }

    return result;
  };

  const importTrades = async (rows: Record<string, string>[]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of rows) {
      try {
        // Find user and account
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", row.user_email)
          .single();

        if (!profile) {
          result.errors.push(`User not found: ${row.user_email}`);
          result.failed++;
          continue;
        }

        const { data: account } = await supabase
          .from("accounts")
          .select("id")
          .eq("account_number", row.account_number)
          .single();

        if (!account) {
          result.errors.push(`Account not found: ${row.account_number}`);
          result.failed++;
          continue;
        }

        const { error } = await supabase.from("trades").insert({
          user_id: profile.user_id,
          account_id: account.id,
          symbol: row.symbol || "EUR/USD",
          direction: row.direction?.toLowerCase() || "buy",
          lot_size: parseFloat(row.lot_size) || 0.01,
          entry_price: parseFloat(row.entry_price) || 0,
          exit_price: row.exit_price ? parseFloat(row.exit_price) : null,
          pnl: row.pnl ? parseFloat(row.pnl) : null,
          status: row.status || "closed",
          opened_at: row.opened_at || new Date().toISOString(),
          closed_at: row.closed_at || null,
        });

        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.errors.push(`Row error: ${error.message}`);
        result.failed++;
      }
    }

    return result;
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "No File",
        description: "Please select a CSV file to import",
      });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error("No valid data found in CSV");
      }

      let importResult: ImportResult;

      switch (activeTab) {
        case "accounts":
          importResult = await importAccounts(rows);
          break;
        case "challenges":
          importResult = await importChallenges(rows);
          break;
        case "trades":
          importResult = await importTrades(rows);
          break;
        default:
          throw new Error("Invalid import type");
      }

      setResult(importResult);
      toast({
        title: "Import Complete",
        description: `${importResult.success} records imported, ${importResult.failed} failed`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message,
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = (type: string) => {
    let csvContent = "";
    switch (type) {
      case "accounts":
        csvContent = "user_email,account_number,account_size,balance,equity,leverage,status,phase,program_type,account_type\njohn@example.com,PROP-001,50000,51000,51000,1:30,active,evaluation,1-step,prop";
        break;
      case "challenges":
        csvContent = "user_email,account_number,challenge_number,account_size,current_balance,profit_target_percent,max_drawdown_percent,phase,status,program_type,days_traded,min_trading_days\njohn@example.com,PROP-001,CH-001,50000,51000,8,10,phase1,active,1-step,5,2";
        break;
      case "trades":
        csvContent = "user_email,account_number,symbol,direction,lot_size,entry_price,exit_price,pnl,status,opened_at,closed_at\njohn@example.com,PROP-001,EUR/USD,buy,1.0,1.0950,1.0980,300,closed,2024-01-15T10:00:00Z,2024-01-15T14:00:00Z";
        break;
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary/30 border-b border-border/20 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link to="/roots" className="p-2 hover:bg-muted rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-heading font-bold">Data Import Tool</h1>
            <p className="text-sm text-muted-foreground">Bulk import accounts, challenges, and trades from CSV</p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="challenges" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Challenges
            </TabsTrigger>
            <TabsTrigger value="trades" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trades
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    Import {activeTab.charAt(0)?.toUpperCase() + activeTab.slice(1)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate(activeTab)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </CardTitle>
                <CardDescription>
                  Upload a CSV file with {activeTab} data. Download the template for the correct format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null);
                      setResult(null);
                    }}
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Click to upload CSV file</p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="w-full"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Start Import
                    </>
                  )}
                </Button>

                {/* Results */}
                {result && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-2 text-green-500 mb-1">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-semibold">Successful</span>
                        </div>
                        <p className="text-2xl font-bold">{result.success}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="flex items-center gap-2 text-destructive mb-1">
                          <AlertCircle className="w-5 h-5" />
                          <span className="font-semibold">Failed</span>
                        </div>
                        <p className="text-2xl font-bold">{result.failed}</p>
                      </div>
                    </div>

                    {result.errors.length > 0 && (
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <h4 className="font-semibold text-destructive mb-2">Errors:</h4>
                        <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                          {result.errors.slice(0, 10).map((error, i) => (
                            <li key={i} className="text-destructive/80">• {error}</li>
                          ))}
                          {result.errors.length > 10 && (
                            <li className="text-muted-foreground">
                              ...and {result.errors.length - 10} more errors
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDataImport;
