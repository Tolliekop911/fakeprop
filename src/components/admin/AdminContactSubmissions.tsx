import { useState, useEffect } from "react";
import AdminPagination, { paginate } from "@/components/admin/AdminPagination";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Eye, MessageSquare, XCircle, RefreshCw, Loader2, Mail, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface ContactSubmission {
  id: string;
  first_name: string;
  last_name: string;
  city: string | null;
  country: string | null;
  email: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

interface Props {
  user: User | null;
  renderLoadingState: () => JSX.Element;
  renderEmptyState: (msg: string) => JSX.Element;
  getStatusBadge: (status: string, type: any) => JSX.Element;
  formatDate: (d: string) => string;
  toast: (opts: any) => void;
}

const AdminContactSubmissions = ({ user, renderLoadingState, renderEmptyState, getStatusBadge, formatDate, toast }: Props) => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contact_submissions" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSubmissions((data as unknown as ContactSubmission[]) || []);
    } catch {
      toast({ title: "Error", description: "Failed to load contact submissions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Load once on mount
  useEffect(() => { load(); }, []);

  const openSubmission = (sub: ContactSubmission) => {
    setSelected(sub);
    setReplyText(sub.admin_reply || "");
    setViewOpen(true);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("contact_submissions" as any)
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Updated", description: `Submission marked as ${newStatus}` });
      load();
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: newStatus } : null);
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveReply = async () => {
    if (!selected) return;
    setReplySubmitting(true);
    try {
      const { error } = await supabase
        .from("contact_submissions" as any)
        .update({
          admin_reply: replyText.trim(),
          replied_at: new Date().toISOString(),
          replied_by: user?.id,
          status: "replied",
        })
        .eq("id", selected.id);
      if (error) throw error;
      toast({ title: "Reply Saved", description: "Your reply has been recorded." });
      setSelected(prev => prev ? { ...prev, admin_reply: replyText.trim(), status: "replied" } : null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to save reply", variant: "destructive" });
    } finally {
      setReplySubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-heading font-bold">Contact Submissions</h3>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "open", "replied", "closed"].map((status) => (
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Email</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Location</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const query = searchQuery.toLowerCase();
              const filtered = submissions.filter((sub) => {
                const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
                const matchesSearch = !query ||
                  `${sub.first_name} ${sub.last_name}`.toLowerCase().includes(query) ||
                  sub.email.toLowerCase().includes(query) ||
                  (sub.city || "").toLowerCase().includes(query) ||
                  (sub.country || "").toLowerCase().includes(query);
                return matchesStatus && matchesSearch;
              });
              return loading
              ? renderLoadingState()
              : filtered.length === 0
                ? renderEmptyState("No contact submissions found")
                : paginate(filtered, page, PAGE_SIZE).map((sub) => (
                    <tr key={sub.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-4 px-4 font-medium">{sub.first_name} {sub.last_name}</td>
                      <td className="py-4 px-4 text-sm">{sub.email}</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {[sub.city, sub.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="py-4 px-4">{getStatusBadge(sub.status, "ticket")}</td>
                      <td className="py-4 px-4 text-muted-foreground">{formatDate(sub.created_at)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => openSubmission(sub)}>
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                          {sub.status !== "closed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              disabled={processingId === sub.id}
                              onClick={() => handleStatusChange(sub.id, "closed")}
                            >
                              {processingId === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            </Button>
                          )}
                          {sub.status === "closed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary"
                              disabled={processingId === sub.id}
                              onClick={() => handleStatusChange(sub.id, "open")}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ));
            })()}
          </tbody>
        </table>
      </div>
      {(() => {
        const query = searchQuery.toLowerCase();
        const filtered = submissions.filter((sub) => {
          const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
          const matchesSearch = !query ||
            `${sub.first_name} ${sub.last_name}`.toLowerCase().includes(query) ||
            sub.email.toLowerCase().includes(query);
          return matchesStatus && matchesSearch;
        });
        return <AdminPagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} loading={loading} />;
      })()}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              {selected?.first_name} {selected?.last_name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {getStatusBadge(selected.status, "ticket")}
                <span>Email: <a href={`mailto:${selected.email}`} className="text-primary hover:underline">{selected.email}</a></span>
                {selected.city && <span>City: {selected.city}</span>}
                {selected.country && <span>Country: {selected.country}</span>}
                <span>Received: {formatDate(selected.created_at)}</span>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Message</p>
                <div className="bg-muted/30 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{selected.message}</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {selected.status !== "closed" && (
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30"
                    onClick={() => { handleStatusChange(selected.id, "closed"); setViewOpen(false); }}>
                    <XCircle className="w-4 h-4 mr-1" /> Close
                  </Button>
                )}
                {selected.status === "closed" && (
                  <Button size="sm" variant="outline" className="text-primary border-primary/30"
                    onClick={() => handleStatusChange(selected.id, "open")}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Reopen
                  </Button>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" /> Admin Notes / Reply
                </label>
                <Textarea
                  placeholder="Add your notes or reply here (for internal reference)..."
                  className="min-h-[100px]"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleSaveReply}
                  disabled={replySubmitting}
                >
                  {replySubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Reply
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContactSubmissions;
