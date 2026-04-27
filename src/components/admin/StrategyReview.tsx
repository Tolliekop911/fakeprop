import { useState, useEffect } from "react";
import AdminPagination, { paginate } from "@/components/admin/AdminPagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Eye, Check, X, Loader2, ExternalLink, Clock, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/adminLogger";

interface Strategy {
  id: string;
  user_id: string;
  account_id: string;
  file_url: string;
  file_name: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_email?: string;
  account_number?: string;
  challenge_number?: string;
}

// Helper to generate a signed URL and show inline PDF preview
const StrategyFileLink = ({ fileUrl, fileName, inline = false }: { fileUrl: string; fileName: string; inline?: boolean }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (inline) generateUrl();
  }, [fileUrl, inline]);

  const generateUrl = async () => {
    setLoading(true);
    setError(false);
    try {
      // file_url may be stored as a full URL or just a path – extract the storage path
      let storagePath = fileUrl;
      if (storagePath.includes('/storage/v1/object/')) {
        // Extract path after bucket name
        const match = storagePath.match(/\/storage\/v1\/object\/(?:public|sign)\/strategies\/(.+)/);
        if (match) {
          storagePath = decodeURIComponent(match[1]);
        }
      }
      const { data, error: err } = await supabase.storage
        .from("strategies")
        .createSignedUrl(storagePath, 3600);
      if (err) throw err;
      if (data?.signedUrl) {
        setSignedUrl(data.signedUrl);
      }
    } catch (e) {
      console.error("Failed to generate signed URL:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (inline) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <span className="font-medium">{fileName}</span>
          {signedUrl && (
            <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
        {loading && (
          <div className="flex items-center justify-center h-64 bg-muted/50 rounded-lg">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-32 bg-muted/50 rounded-lg text-muted-foreground text-sm">
            Failed to load PDF preview
          </div>
        )}
        {signedUrl && !loading && (
          <iframe
            src={signedUrl}
            className="w-full h-[400px] rounded-lg border border-border"
            title={fileName}
          />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={generateUrl}
      disabled={loading}
      className="flex items-center gap-2 text-primary hover:underline text-sm"
    >
      <FileText className="w-4 h-4" />
      {fileName}
      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
    </button>
  );
};

const StrategyReview = () => {
  const { toast } = useToast();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from("trader_strategies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user emails, account numbers, and challenge numbers
      const userIds = [...new Set((data || []).map(s => s.user_id))];
      const accountIds = [...new Set((data || []).map(s => s.account_id))];

      const [profilesRes, accountsRes, challengesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, email").in("user_id", userIds),
        supabase.from("accounts").select("id, account_number").in("id", accountIds),
        supabase.from("challenges").select("account_id, challenge_number").in("account_id", accountIds),
      ]);

      const profileMap = (profilesRes.data || []).reduce((acc: Record<string, string>, p) => {
        acc[p.user_id] = p.email || "";
        return acc;
      }, {});

      const accountMap = (accountsRes.data || []).reduce((acc: Record<string, string>, a) => {
        acc[a.id] = a.account_number;
        return acc;
      }, {});

      const challengeMap = (challengesRes.data || []).reduce((acc: Record<string, string>, c) => {
        acc[c.account_id] = c.challenge_number;
        return acc;
      }, {});

      setStrategies(
        (data || []).map(s => ({
          ...s,
          user_email: profileMap[s.user_id],
          account_number: accountMap[s.account_id],
          challenge_number: challengeMap[s.account_id],
        }))
      );
    } catch (e) {
      console.error("Error loading strategies:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "approve" | "reject") => {
    if (!selectedStrategy) return;
    
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("trader_strategies")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          admin_notes: adminNotes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedStrategy.id);

      if (error) throw error;

      // When strategy is approved, enable the linked funded account
      if (action === "approve") {
        const { error: accountError } = await supabase
          .from("accounts")
          .update({ status: "active" })
          .eq("id", selectedStrategy.account_id);
        
        if (accountError) {
          console.error("Failed to enable account:", accountError);
        }

        // Look up the challenge ID linked to this account (Condor uses challengeId)
        const { data: challengeData } = await supabase
          .from("challenges")
          .select("id")
          .eq("account_id", selectedStrategy.account_id)
          .eq("phase", "funded")
          .limit(1)
          .maybeSingle();

        if (!challengeData?.id) {
          console.error("No funded challenge found for account_id:", selectedStrategy.account_id);
          toast({
            title: "Warning",
            description: "Strategy approved but no funded challenge found to enable on Condor",
            variant: "destructive",
          });
        } else {
          // Enable account on Condor using the challenge ID
          console.log(`Enabling on Condor: challengeId=${challengeData.id}, account_id=${selectedStrategy.account_id}`);
          const { error: condorError } = await supabase.functions.invoke("manage-condor-account", {
            body: { action: "enable", challengeId: challengeData.id },
          });
          if (condorError) {
            console.error("Failed to enable account on Condor:", condorError);
            toast({
              title: "Warning",
              description: "Strategy approved but Condor enable API call failed",
              variant: "destructive",
            });
          }
        }
      }

      await logAdminAction(`strategy_${action === "approve" ? "approved" : "rejected"}`, "strategy", selectedStrategy.id, {
        user_id: selectedStrategy.user_id,
        account_id: selectedStrategy.account_id,
        file_name: selectedStrategy.file_name,
      });

      toast({
        title: action === "approve" ? "Strategy Approved" : "Strategy Rejected",
        description: `The strategy has been ${action === "approve" ? "approved" : "rejected"}`,
      });

      setSelectedStrategy(null);
      setAdminNotes("");
      loadStrategies();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to update strategy",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Strategy Reviews
        </h2>
        <p className="text-muted-foreground">
          Review trader strategy documents for funded accounts
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by trader, account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "pending", "approved", "rejected"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trader</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Challenge</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              const filtered = strategies.filter((s) => {
                const matchesStatus = statusFilter === "all" || s.status === statusFilter;
                const query = searchQuery.toLowerCase();
                const matchesSearch = !query ||
                  (s.user_email || "").toLowerCase().includes(query) ||
                  (s.account_number || "").toLowerCase().includes(query) ||
                  s.file_name.toLowerCase().includes(query);
                return matchesStatus && matchesSearch;
              });
              return filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No strategy documents found
                </TableCell>
              </TableRow>
            ) : (
              paginate(filtered, page, PAGE_SIZE).map((strategy) => (
                <TableRow key={strategy.id}>
                  <TableCell className="font-medium">
                    {strategy.user_email || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {strategy.account_number || strategy.account_id.slice(0, 8)}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {strategy.challenge_number || "—"}
                    </code>
                  </TableCell>
                  <TableCell>
                    <StrategyFileLink fileUrl={strategy.file_url} fileName={strategy.file_name} />
                  </TableCell>
                  <TableCell>
                    {new Date(strategy.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(strategy.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedStrategy(strategy);
                        setAdminNotes(strategy.admin_notes || "");
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            );
            })()}
          </TableBody>
        </Table>
      </div>
      {(() => {
        const filtered = strategies.filter((s) => {
          const matchesStatus = statusFilter === "all" || s.status === statusFilter;
          const query = searchQuery.toLowerCase();
          const matchesSearch = !query ||
            (s.user_email || "").toLowerCase().includes(query) ||
            (s.account_number || "").toLowerCase().includes(query) ||
            s.file_name.toLowerCase().includes(query);
          return matchesStatus && matchesSearch;
        });
        return <AdminPagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />;
      })()}

      <Dialog open={!!selectedStrategy} onOpenChange={(open) => !open && setSelectedStrategy(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Strategy Document</DialogTitle>
            <DialogDescription>
              Review the trader's strategy and approve or reject it
            </DialogDescription>
          </DialogHeader>

          {selectedStrategy && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Trader:</span>
                  <p className="font-medium">{selectedStrategy.user_email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Account:</span>
                  <p className="font-medium">{selectedStrategy.account_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Challenge:</span>
                  <p className="font-medium">{selectedStrategy.challenge_number || "—"}</p>
                </div>
              </div>

              <StrategyFileLink fileUrl={selectedStrategy.file_url} fileName={selectedStrategy.file_name} inline />

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (optional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction("reject")}
                  variant="destructive"
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                  Reject
                </Button>
                <Button
                  onClick={() => handleAction("approve")}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StrategyReview;