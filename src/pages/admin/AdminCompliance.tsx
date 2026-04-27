import { useState, useEffect } from "react";
import AdminPagination, { paginate } from "@/components/admin/AdminPagination";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Eye,
  FileText,
  Loader2,
  Package,
  User,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/adminLogger";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface KycSubmission {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  document_type: string;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  address_proof_url: string | null;
  status: string;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

// Extract storage path from a full public URL
const extractStoragePath = (url: string | null): string | null => {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/public\/kyc-documents\/(.+)$/);
  return match ? match[1] : null;
};

const isPdfUrl = (url: string | null): boolean => {
  if (!url) return false;
  return url.toLowerCase().includes('.pdf');
};

const DocumentPreview = ({ url, originalUrl, label }: { url: string; originalUrl: string | null; label: string }) => {
  if (isPdfUrl(originalUrl)) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="border border-border rounded-lg overflow-hidden">
          <iframe src={url} title={label} className="w-full h-64 bg-muted" />
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-2 text-sm text-primary hover:underline bg-muted/30">
            <ExternalLink className="w-3 h-3" /> Open PDF in new tab
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="block border border-border rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all">
        <img src={url} alt={label} className="w-full h-48 object-cover bg-muted" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-48 flex items-center justify-center bg-muted text-muted-foreground text-sm">Click to view file</div>'; }} />
      </a>
    </div>
  );
};

const AdminCompliance = () => {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const [selectedSubmission, setSelectedSubmission] = useState<KycSubmission | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const getSignedUrl = async (url: string | null): Promise<string | null> => {
    const path = extractStoragePath(url);
    if (!path) return null;
    const { data, error } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 3600);
    if (error) { console.error("Signed URL error:", error); return null; }
    return data.signedUrl;
  };

  const loadSignedUrls = async (submission: KycSubmission) => {
    const urls: Record<string, string> = {};
    const fields = ["document_front_url", "document_back_url", "selfie_url", "address_proof_url"] as const;
    await Promise.all(fields.map(async (field) => {
      const signed = await getSignedUrl(submission[field]);
      if (signed) urls[field] = signed;
    }));
    setSignedUrls(urls);
  };

  const handleViewSubmission = async (submission: KycSubmission) => {
    setSelectedSubmission(submission);
    setSignedUrls({});
    await loadSignedUrls(submission);
  };



  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("kyc_submissions")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Error fetching KYC submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkUnderReview = async (submissionId: string) => {
    setProcessingId(submissionId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("kyc_submissions")
        .update({
          status: "under_review",
          reviewed_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      if (error) throw error;

      await logAdminAction("kyc_under_review", "kyc_submission", submissionId, {
        action: "Marked as under review",
      });

      toast({ title: "Status Updated", description: "Submission marked as under review" });
      fetchSubmissions();
    } catch (error) {
      console.error("Error updating KYC:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update status" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (submissionId: string) => {
    setProcessingId(submissionId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("kyc_submissions")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      if (error) throw error;

      await logAdminAction("kyc_approved", "kyc_submission", submissionId, {
        user_id: submissions.find(s => s.id === submissionId)?.user_id,
      });

      toast({
        title: "KYC Approved",
        description: "User verification has been approved",
      });

      fetchSubmissions();
    } catch (error) {
      console.error("Error approving KYC:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve KYC",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission || !rejectionReason.trim()) return;
    
    setProcessingId(selectedSubmission.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("kyc_submissions")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason.trim(),
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      await logAdminAction("kyc_rejected", "kyc_submission", selectedSubmission.id, {
        user_id: selectedSubmission.user_id,
        reason: rejectionReason,
      });

      toast({
        title: "KYC Rejected",
        description: "User verification has been rejected",
      });

      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error("Error rejecting KYC:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject KYC",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSubmissions = submissions.filter(
    (s) =>
      s.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 text-xs rounded bg-yellow-500/10 text-yellow-500">Pending</span>;
      case "under_review":
        return <span className="px-2 py-1 text-xs rounded bg-blue-500/10 text-blue-500">Under Review</span>;
      case "approved":
        return <span className="px-2 py-1 text-xs rounded bg-green-500/10 text-green-500">Approved</span>;
      case "rejected":
        return <span className="px-2 py-1 text-xs rounded bg-destructive/10 text-destructive">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground">{status}</span>;
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      passport: "Passport",
      id_card: "ID Card",
      drivers_license: "Driver's License",
    };
    return labels[type] || type;
  };

  const stats = {
    pending: submissions.filter((s) => s.status === "pending").length,
    underReview: submissions.filter((s) => s.status === "under_review").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    rejected: submissions.filter((s) => s.status === "rejected").length,
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
            <h1 className="text-xl font-heading font-bold">Compliance Management</h1>
            <p className="text-sm text-muted-foreground">Review and process KYC submissions</p>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pending Review</span>
            </div>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Under Review</span>
            </div>
            <p className="text-2xl font-bold">{stats.underReview}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Approved</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <span className="text-sm text-muted-foreground">Rejected</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {["all", "pending", "under_review", "approved", "rejected"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="capitalize"
              >
                {status.replace("_", " ")}
              </Button>
            ))}
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No KYC submissions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">User / KYC</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Document Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Documents</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Submitted</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginate(filteredSubmissions, page, PAGE_SIZE).map((submission) => (
                    <tr key={submission.id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{submission.user_name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{submission.user_email}</p>
                            <div className="mt-2">{getStatusBadge(submission.status)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 text-xs rounded bg-muted">
                          {getDocumentTypeBadge(submission.document_type)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleViewSubmission(submission)}
                          >
                            <Eye className="w-3 h-3 mr-1" /> View All
                          </Button>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        {processingId === submission.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : submission.status === "pending" || submission.status === "under_review" ? (
                          <div className="flex gap-2">
                            {submission.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-500 hover:bg-blue-500/10"
                                onClick={() => handleMarkUnderReview(submission.id)}
                                title="Mark as Under Review"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-500 hover:bg-green-500/10"
                              onClick={() => handleApprove(submission.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setShowRejectDialog(true);
                              }}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : submission.status === "rejected" ? (
                          <span className="text-xs text-muted-foreground" title={submission.rejection_reason || ""}>
                            {submission.rejection_reason?.slice(0, 30)}...
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AdminPagination currentPage={page} totalItems={filteredSubmissions.length} pageSize={PAGE_SIZE} onPageChange={setPage} loading={loading} />
        </div>
      </div>

      {/* Document Viewer Dialog */}
      <Dialog open={!!selectedSubmission && !showRejectDialog} onOpenChange={(open) => { if (!open) setSelectedSubmission(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KYC Documents — {selectedSubmission?.user_name || selectedSubmission?.user_email || "User"}</DialogTitle>
            <DialogDescription>
              {getDocumentTypeBadge(selectedSubmission?.document_type || "")} · Submitted {selectedSubmission ? new Date(selectedSubmission.submitted_at).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>

          {Object.keys(signedUrls).length === 0 && selectedSubmission ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-muted-foreground">Loading documents...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {signedUrls.document_front_url && (
                <DocumentPreview url={signedUrls.document_front_url} originalUrl={selectedSubmission?.document_front_url || null} label="Document Front" />
              )}
              {signedUrls.document_back_url && (
                <DocumentPreview url={signedUrls.document_back_url} originalUrl={selectedSubmission?.document_back_url || null} label="Document Back" />
              )}
              {signedUrls.selfie_url && (
                <DocumentPreview url={signedUrls.selfie_url} originalUrl={selectedSubmission?.selfie_url || null} label="Selfie with Document" />
              )}
              {signedUrls.address_proof_url && (
                <DocumentPreview url={signedUrls.address_proof_url} originalUrl={selectedSubmission?.address_proof_url || null} label="Proof of Residency" />
              )}
            </div>
          )}

          {selectedSubmission?.status === "rejected" && selectedSubmission.rejection_reason && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive"><strong>Rejection reason:</strong> {selectedSubmission.rejection_reason}</p>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {(selectedSubmission?.status === "pending" || selectedSubmission?.status === "under_review") && (
              <>
                <Button
                  variant="outline"
                  className="text-green-500 hover:bg-green-500/10"
                  onClick={() => { handleApprove(selectedSubmission!.id); setSelectedSubmission(null); }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC Submission</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this verification request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processingId !== null}
            >
              {processingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCompliance;
