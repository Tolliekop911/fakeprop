import { useState, useEffect, useMemo } from "react";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, Award, Eye, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CertificateRenderer from "@/components/prop/CertificateRenderer";

interface CertData {
  id: string;
  type: "completion" | "payout";
  label: string;
  account: string;
  date: string;
  amount?: number;
  status: string;
}

const PropCertificates = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [certificates, setCertificates] = useState<CertData[]>([]);
  const [previewCert, setPreviewCert] = useState<CertData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const name = profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.full_name || ""
        : "";
      setFullName(name);

      const certs: CertData[] = [];

      // Completion certificates: challenges with status "passed" or phase "funded"
      const { data: passedChallenges } = await supabase
        .from("challenges")
        .select("id, phase, account_size, created_at, account_id, status")
        .eq("user_id", user.id)
        .or("status.eq.passed,phase.eq.funded");

      if (passedChallenges) {
        for (const ch of passedChallenges) {
          const { data: acc } = await supabase
            .from("accounts")
            .select("account_number")
            .eq("id", ch.account_id)
            .maybeSingle();

          const phase = String(ch.phase);
          certs.push({
            id: `COMP-${ch.id.slice(0, 8)}`,
            type: "completion",
            label: phase.toLowerCase().includes("fund") ? "Funded Trader Certificate" : `${phase} Completion Certificate`,
            account: acc?.account_number || "N/A",
            date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }),
            status: "Available",
          });
        }
      }

      // Payout certificates: paid payouts
      const { data: paidPayouts } = await supabase
        .from("payouts")
        .select("id, amount, processed_at, requested_at, account_id")
        .eq("user_id", user.id)
        .eq("status", "paid");

      if (paidPayouts) {
        for (const p of paidPayouts) {
          const { data: acc } = await supabase
            .from("accounts")
            .select("account_number")
            .eq("id", p.account_id)
            .maybeSingle();

          certs.push({
            id: `PAY-${p.id.slice(0, 8)}`,
            type: "payout",
            label: "Payout Certificate",
            account: acc?.account_number || "N/A",
            date: new Date(p.processed_at || p.requested_at).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }),
            amount: p.amount,
            status: "Available",
          });
        }
      }

      setCertificates(certs);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <PropDashboardLayout title="Certificates">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PropDashboardLayout>
    );
  }

  return (
    <PropDashboardLayout title="Certificates">
      <div className="space-y-6">
        {/* Preview Modal */}
        {previewCert && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewCert(null)}>
            <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end mb-2">
                <Button variant="ghost" size="sm" onClick={() => setPreviewCert(null)} className="text-white hover:text-white/80">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <CertificateRenderer
                type={previewCert.type}
                fullName={fullName}
                date={previewCert.date}
                amount={previewCert.amount}
                account={previewCert.account}
              />
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Trading Certificates
            </CardTitle>
            <CardDescription>
              View and download your trading achievement certificates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {certificates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No certificates available yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete your challenge phases or receive payouts to earn certificates
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Award className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{cert.label}</p>
                        <p className="text-sm text-muted-foreground">
                          Account: {cert.account} • {cert.date}
                          {cert.amount != null && ` • $${cert.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-500">
                        {cert.status}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => setPreviewCert(cert)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
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

export default PropCertificates;
