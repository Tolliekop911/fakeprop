import { useState } from "react";
import AdminPagination, { paginate } from "@/components/admin/AdminPagination";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Eye, MessageSquare, XCircle, RefreshCw, Loader2, UserCheck, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AdminTicket {
  id: string;
  user_id: string;
  user_email?: string;
  subject: string;
  status: string;
  priority: string | null;
  created_at: string;
}

interface AdminUser {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  account_count: number;
}

interface Props {
  ticketsData: AdminTicket[];
  tabLoading: boolean;
  loadTickets: () => void;
  user: User | null;
  usersData: AdminUser[];
  renderLoadingState: () => JSX.Element;
  renderEmptyState: (msg: string) => JSX.Element;
  getStatusBadge: (status: string, type: any) => JSX.Element;
  formatDate: (d: string) => string;
  toast: (opts: any) => void;
}

const AdminSupportTickets = ({
  ticketsData,
  tabLoading,
  loadTickets,
  user,
  usersData,
  renderLoadingState,
  renderEmptyState,
  getStatusBadge,
  formatDate,
  toast,
}: Props) => {
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [ticketMessage, setTicketMessage] = useState<string>("");
  const [viewOpen, setViewOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [reassignTo, setReassignTo] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const openTicket = async (ticket: AdminTicket) => {
    setSelectedTicket(ticket);
    // Load full message
    const { data } = await supabase.from("tickets").select("message").eq("id", ticket.id).single();
    setTicketMessage(data?.message || "");
    setViewOpen(true);
    setReplyText("");
    setReassignTo("");
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    setProcessingId(ticketId);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", ticketId);
      if (error) throw error;
      toast({ title: "Updated", description: `Ticket marked as ${newStatus}` });
      loadTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      toast({ title: "Error", description: "Failed to update ticket", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setReplySubmitting(true);
    try {
      const adminEmail = user?.email || "Admin";
      const updatedMessage = ticketMessage + `\n\n--- Admin Reply (${adminEmail}, ${new Date().toLocaleString()}) ---\n${replyText.trim()}`;
      const { error } = await supabase.from("tickets").update({
        message: updatedMessage,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      }).eq("id", selectedTicket.id);
      if (error) throw error;
      toast({ title: "Reply Sent", description: "Your reply has been added to the ticket." });
      setTicketMessage(updatedMessage);
      setReplyText("");
      setSelectedTicket(prev => prev ? { ...prev, status: "in_progress" } : null);
      loadTickets();
    } catch {
      toast({ title: "Error", description: "Failed to send reply", variant: "destructive" });
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleReassign = async () => {
    if (!reassignTo || !selectedTicket) return;
    try {
      const { error } = await supabase.from("tickets").update({
        assigned_to: reassignTo,
        updated_at: new Date().toISOString(),
      }).eq("id", selectedTicket.id);
      if (error) throw error;
      const assignedUser = usersData.find(u => u.user_id === reassignTo);
      toast({ title: "Reassigned", description: `Ticket assigned to ${assignedUser?.email || assignedUser?.full_name || "selected user"}` });
      loadTickets();
    } catch {
      toast({ title: "Error", description: "Failed to reassign ticket", variant: "destructive" });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-heading font-bold">Support Tickets</h3>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, subject..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "open", "in_progress", "resolved", "closed"].map((status) => (
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Ticket ID</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">User</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Subject</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Priority</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Created</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const query = searchQuery.toLowerCase();
              const filtered = ticketsData.filter((ticket) => {
                const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
                const matchesSearch = !query ||
                  (ticket.user_email || "").toLowerCase().includes(query) ||
                  ticket.subject.toLowerCase().includes(query) ||
                  ticket.id.toLowerCase().includes(query);
                return matchesStatus && matchesSearch;
              });
              return tabLoading
              ? renderLoadingState()
              : filtered.length === 0
                ? renderEmptyState("No support tickets found")
                : paginate(filtered, page, PAGE_SIZE).map((ticket) => (
                    <tr key={ticket.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-4 px-4 font-mono text-sm">{ticket.id.slice(0, 8)}</td>
                      <td className="py-4 px-4">{ticket.user_email || "—"}</td>
                      <td className="py-4 px-4">{ticket.subject}</td>
                      <td className="py-4 px-4">
                        <span className={`text-xs px-2 py-1 rounded ${
                          ticket.priority === "high" || ticket.priority === "urgent"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {ticket.priority || "normal"}
                        </span>
                      </td>
                      <td className="py-4 px-4">{getStatusBadge(ticket.status, "ticket")}</td>
                      <td className="py-4 px-4 text-muted-foreground">{formatDate(ticket.created_at)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button variant="outline" size="sm" title="View Ticket" onClick={() => openTicket(ticket)}>
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                          <Button variant="outline" size="sm" title="Reply" onClick={() => openTicket(ticket)} className="text-primary border-primary/30 hover:bg-primary/10">
                            <MessageSquare className="w-4 h-4 mr-1" /> Reply
                          </Button>
                          {ticket.status !== "closed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              title="Close Ticket"
                              disabled={processingId === ticket.id}
                              onClick={() => handleStatusChange(ticket.id, "closed")}
                            >
                              {processingId === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            </Button>
                          )}
                          {ticket.status === "closed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary"
                              title="Reopen Ticket"
                              disabled={processingId === ticket.id}
                              onClick={() => handleStatusChange(ticket.id, "open")}
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
        const filtered = ticketsData.filter((ticket) => {
          const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
          const matchesSearch = !query ||
            (ticket.user_email || "").toLowerCase().includes(query) ||
            ticket.subject.toLowerCase().includes(query) ||
            ticket.id.toLowerCase().includes(query);
          return matchesStatus && matchesSearch;
        });
        return <AdminPagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} loading={tabLoading} />;
      })()}
      {/* Ticket Detail Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              {selectedTicket?.subject}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                {getStatusBadge(selectedTicket.status, "ticket")}
                <span className="text-sm text-muted-foreground">From: {selectedTicket.user_email || "—"}</span>
                <span className="text-sm text-muted-foreground">Created: {formatDate(selectedTicket.created_at)}</span>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">{ticketMessage}</p>
              </div>

              {/* Quick status actions */}
              <div className="flex gap-2 flex-wrap">
                {selectedTicket.status !== "resolved" && (
                  <Button size="sm" variant="outline" className="text-primary border-primary/30"
                    onClick={() => handleStatusChange(selectedTicket.id, "resolved")}>
                    Mark Resolved
                  </Button>
                )}
                {selectedTicket.status !== "closed" && (
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30"
                    onClick={() => { handleStatusChange(selectedTicket.id, "closed"); setViewOpen(false); }}>
                    <XCircle className="w-4 h-4 mr-1" /> Close
                  </Button>
                )}
                {selectedTicket.status === "closed" && (
                  <Button size="sm" variant="outline" className="text-primary border-primary/30"
                    onClick={() => handleStatusChange(selectedTicket.id, "open")}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Reopen
                  </Button>
                )}
              </div>

              {/* Reassign */}
              {usersData.length > 0 && (
                <div className="border-t border-border pt-4 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <UserCheck className="w-4 h-4" /> Reassign Ticket
                  </label>
                  <div className="flex gap-2">
                    <Select value={reassignTo} onValueChange={setReassignTo}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select admin/user to assign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {usersData.map(u => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.full_name || u.email || u.user_id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleReassign} disabled={!reassignTo}>Assign</Button>
                  </div>
                </div>
              )}

              {/* Reply */}
              <div className="border-t border-border pt-4 space-y-2">
                <label className="text-sm font-medium">Reply to Ticket</label>
                <Textarea
                  placeholder="Type your admin reply..."
                  className="min-h-[100px]"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleReply}
                  disabled={replySubmitting || !replyText.trim()}
                >
                  {replySubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Send Reply
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSupportTickets;
