import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, DollarSign, TrendingUp, ClipboardList, Download, Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadBlob, toCSV } from "@/lib/download";

const PropReports = () => {
  const location = useLocation();

  const navigate = useNavigate();
  const { toast } = useToast();

  const currentTab = useMemo(() => {
    const last = location.pathname.split("/").pop() || "certificates";
    return ["certificates", "deposits", "trades", "summary"].includes(last) ? last : "certificates";
  }, [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const userId = userRes.user.id;

      const [accountsRes, payoutsRes, tradesRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, account_number, account_size, balance, equity, phase, status, account_type")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("payouts")
          .select("id, amount, payment_method, requested_at, processed_at, status, account_id")
          .eq("user_id", userId)
          .order("requested_at", { ascending: false }),
        supabase
          .from("trades")
          .select("id, opened_at, symbol, direction, lot_size, entry_price, exit_price, pnl, status")
          .eq("user_id", userId)
          .order("opened_at", { ascending: false })
          .limit(500),
      ]);

      if (cancelled) return;
      setAccounts(accountsRes.data ?? []);
      setPayouts(payoutsRes.data ?? []);
      setTrades(tradesRes.data ?? []);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const accountSummaryRows = useMemo(() => {
    return accounts.map((a) => {
        const size = a.account_size ?? 0;
        const bal = a.balance ?? 0;
        const profit = (a.balance ?? 0) - (a.account_size ?? 0);
        return {
          account: a.account_number,
          size: size,
          balance: bal,
          profit,
          phase: a.phase ?? "-",
          status: a.status ?? "-",
        };
      });
  }, [accounts]);

  const certificates = useMemo(() => {
    // Derived certificates: if there isn't a dedicated certificates table yet, generate from account status/phase.
    return accountSummaryRows
      .filter((a) => a.status === "passed")
      .map((a) => {
        const phase = String(a.phase);
        const type = phase.toLowerCase().includes("fund") ? "Funded Trader" : `${phase} Completion`;
        return {
          id: `CERT-${String(a.account).replace(/[^a-z0-9]/gi, "").slice(-6)}`,
          type,
          account: a.account,
          date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
          status: "Issued",
        };
      });
  }, [accountSummaryRows]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number.isFinite(n) ? n : 0);

  const onTabChange = (value: string) => {
    navigate(`/prop/reports/${value}`);
  };

  const handleExportTradesCSV = () => {
    if (!trades.length) {
      toast({ title: "No trades", description: "There are no trades to export." });
      return;
    }
    const rows = trades.map((t) => ({
      id: t.id,
      opened_at: t.opened_at,
      symbol: t.symbol,
      direction: t.direction,
      lot_size: t.lot_size,
      entry_price: t.entry_price,
      exit_price: t.exit_price,
      pnl: t.pnl,
      status: t.status,
    }));
    const csv = toCSV(rows);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `prop-trades-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleDownloadCertificate = (cert: { id: string; type: string; account: string; date: string; status: string }) => {
    const text = [
      "KUBERA PROP — TRADING CERTIFICATE",
      "",
      `Certificate ID: ${cert.id}`,
      `Type: ${cert.type}`,
      `Account: ${cert.account}`,
      `Issued: ${cert.date}`,
      `Status: ${cert.status}`,
      "",
      "(This certificate is generated by the platform.)",
    ].join("\n");
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${cert.id}.txt`);
  };

  return (
    <PropDashboardLayout title="Reports">
      <Tabs value={currentTab} onValueChange={onTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="certificates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="deposits" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Deposits
          </TabsTrigger>
          <TabsTrigger value="trades" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trades
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        {/* Certificates */}
        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle>Trading Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-10 rounded bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded bg-muted/40 animate-pulse" />
                </div>
              ) : certificates.length === 0 ? (
                <div className="text-sm text-muted-foreground">No certificates available yet.</div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Certificate ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Account</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((cert) => (
                      <tr key={cert.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-4 px-4 font-mono text-sm">{cert.id}</td>
                        <td className="py-4 px-4">{cert.type}</td>
                        <td className="py-4 px-4 font-mono text-sm">{cert.account}</td>
                        <td className="py-4 px-4 text-muted-foreground">{cert.date}</td>
                        <td className="py-4 px-4">
                          <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-500">{cert.status}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                toast({ title: "Preview", description: "Preview is not enabled yet." });
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDownloadCertificate(cert)}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deposits */}
        <TabsContent value="deposits">
          <Card>
            <CardHeader>
              <CardTitle>Deposit History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Your deposit and transaction history will appear here once payments are processed.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trades */}
        <TabsContent value="trades">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Trade History</CardTitle>
              <Button variant="outline" onClick={handleExportTradesCSV}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-10 rounded bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded bg-muted/40 animate-pulse" />
                </div>
              ) : trades.length === 0 ? (
                <div className="text-sm text-muted-foreground">No trades yet.</div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Symbol</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Direction</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Lot Size</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Entry</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Exit</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-4 px-4 text-muted-foreground">
                          {trade.opened_at ? new Date(trade.opened_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-4 px-4 font-semibold">{trade.symbol}</td>
                        <td className="py-4 px-4">
                          <span className={`text-xs px-2 py-1 rounded ${
                            trade.direction === "BUY" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                          }`}>
                            {trade.direction}
                          </span>
                        </td>
                        <td className="py-4 px-4">{trade.lot_size}</td>
                        <td className="py-4 px-4">{trade.entry_price}</td>
                        <td className="py-4 px-4">{trade.exit_price ?? "-"}</td>
                        <td className={`py-4 px-4 font-semibold ${Number(trade.pnl ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {trade.pnl === null || trade.pnl === undefined ? "-" : formatCurrency(trade.pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Summary */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-10 rounded bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded bg-muted/40 animate-pulse" />
                </div>
              ) : accountSummaryRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">No accounts yet.</div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Account</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Size</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Balance</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Profit</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Phase</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountSummaryRows.map((account) => (
                      <tr key={account.account} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-4 px-4 font-mono text-sm">{account.account}</td>
                        <td className="py-4 px-4">{formatCurrency(account.size)}</td>
                        <td className="py-4 px-4 font-semibold">{formatCurrency(account.balance)}</td>
                        <td className={`py-4 px-4 font-semibold ${account.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {formatCurrency(account.profit)}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-xs px-2 py-1 rounded ${
                            account.phase === "Funded" ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
                          }`}>
                            {account.phase}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-500">{account.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PropDashboardLayout>
  );
};

export default PropReports;

