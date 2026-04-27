import { useState, useEffect } from "react";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Headphones, Plus, Loader2, Package, ChevronDown, ChevronUp, MessageSquare, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string | null;
  created_at: string;
  updated_at: string;
}

const PropSupport = () => {
  const { toast } = useToast();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("tickets")
        .select("id, subject, message, status, priority, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (e) {
      console.error("Error loading tickets:", e);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmitTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      toast({ title: "Required", description: "Please fill in subject and message", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { error } = await supabase.from("tickets").insert({
        user_id: user.id,
        subject: newSubject.trim(),
        message: newMessage.trim(),
        status: "open",
        priority: "normal",
      });

      if (error) throw error;

      toast({ title: "Ticket Created", description: "Your support ticket has been submitted." });
      setNewSubject("");
      setNewMessage("");
      loadTickets();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to create ticket", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("tickets").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", ticketId);
      if (error) throw error;
      toast({ title: "Ticket Updated", description: `Ticket marked as ${newStatus}` });
      loadTickets();
    } catch (e: any) {
      toast({ title: "Error", description: "Failed to update ticket", variant: "destructive" });
    }
  };

  const handleReplySubmit = async (ticket: Ticket) => {
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    try {
      const updatedMessage = ticket.message + `\n\n--- Your Reply (${new Date().toLocaleString()}) ---\n${replyText.trim()}`;
      const { error } = await supabase.from("tickets").update({
        message: updatedMessage,
        status: "open",
        updated_at: new Date().toISOString()
      }).eq("id", ticket.id);

      if (error) throw error;
      toast({ title: "Reply Sent", description: "Your reply has been added to the ticket." });
      setReplyText("");
      loadTickets();
    } catch (e: any) {
      toast({ title: "Error", description: "Failed to send reply", variant: "destructive" });
    } finally {
      setReplySubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getStatusBadge = (status: string) => (
    <span className={`text-xs px-2 py-1 rounded font-medium ${
      status === "open" ? "bg-blue-500/10 text-blue-500" :
      status === "resolved" ? "bg-green-500/10 text-green-500" :
      status === "closed" ? "bg-muted text-muted-foreground" :
      status === "in_progress" ? "bg-yellow-500/10 text-yellow-500" :
      "bg-muted text-muted-foreground"
    }`}>
      {status.replace("_", " ")}
    </span>
  );

  const toggleExpand = (ticketId: string) => {
    setExpandedTicketId(prev => prev === ticketId ? null : ticketId);
    setReplyText("");
  };

  return (
    <PropDashboardLayout title="Helpdesk Tickets">
      <div className="space-y-6">
        {/* Tickets List */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-primary" />
                Support Tickets
              </CardTitle>
              <CardDescription>View and manage your support requests</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No support tickets yet</p>
                <p className="text-sm text-muted-foreground">Create a new ticket below if you need help</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => {
                  const isExpanded = expandedTicketId === ticket.id;
                  return (
                    <div key={ticket.id} className="border border-border rounded-lg overflow-hidden">
                      {/* Ticket header row - clickable to expand */}
                      <button
                        onClick={() => toggleExpand(ticket.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors text-left"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <span className="font-mono text-sm text-muted-foreground shrink-0">{ticket.id.slice(0, 8)}</span>
                          <span className="font-medium truncate">{ticket.subject}</span>
                          {getStatusBadge(ticket.status)}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <span className="text-sm text-muted-foreground hidden sm:inline">{formatDate(ticket.created_at)}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-border p-4 space-y-4 bg-muted/10">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:hidden">
                            Created: {formatDate(ticket.created_at)}
                          </div>

                          {/* Message */}
                          <div className="bg-muted/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                            <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 flex-wrap">
                            {ticket.status !== "closed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/30"
                                onClick={() => handleStatusChange(ticket.id, "closed")}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Close Ticket
                              </Button>
                            )}
                            {ticket.status === "closed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary/30"
                                onClick={() => handleStatusChange(ticket.id, "open")}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Reopen Ticket
                              </Button>
                            )}
                          </div>

                          {/* Reply section */}
                          <div className="border-t border-border pt-4 space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-primary" />
                              Add a Reply
                            </label>
                            <Textarea
                              placeholder="Type your reply or additional information..."
                              className="min-h-[100px]"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                            />
                            <Button
                              className="bg-primary hover:bg-primary/90"
                              onClick={() => handleReplySubmit(ticket)}
                              disabled={replySubmitting || !replyText.trim()}
                            >
                              {replySubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                              Send Reply
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create New Ticket */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Create New Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                placeholder="Brief description of your issue"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Describe your issue in detail..."
                className="min-h-[120px]"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
            </div>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleSubmitTicket}
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Submit Ticket
            </Button>
          </CardContent>
        </Card>
      </div>
    </PropDashboardLayout>
  );
};

export default PropSupport;
