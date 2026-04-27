import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Send, 
  User, 
  Bot, 
  Headphones, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle,
  Search,
  RefreshCw,
  Ban,
  Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, addDays, addHours } from "date-fns";

interface Conversation {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  status: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  escalated_at: string | null;
  assigned_admin_id: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: "user" | "ai" | "admin";
  content: string;
  created_at: string;
}

interface ChatBan {
  id: string;
  user_email: string;
  ban_reason: string | null;
  banned_at: string;
  expires_at: string;
}

const AdminChatManagement = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "escalated" | "active" | "resolved" | "closed" | "assigned">("escalated");
  const [searchQuery, setSearchQuery] = useState("");
  const [banDuration, setBanDuration] = useState("24h");
  const [banReason, setBanReason] = useState("");
  const [isBanning, setIsBanning] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [chatBans, setChatBans] = useState<ChatBan[]>([]);
  const [showBansTab, setShowBansTab] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [adminList, setAdminList] = useState<{id: string; email: string}[]>([]);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (filter === "assigned") {
        if (currentUserId) {
          query = query.eq("assigned_admin_id", currentUserId);
        }
      } else if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load conversations",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email")
        .not("email", "is", null);
      // Filter to only those with admin/moderator roles
      const { data: roles } = await supabase.from("user_roles").select("user_id");
      const adminIds = new Set((roles || []).map(r => r.user_id));
      setAdminList(
        (data || [])
          .filter(p => adminIds.has(p.user_id))
          .map(p => ({ id: p.user_id, email: p.email || "" }))
      );
    } catch (e) {
      console.error("Error fetching admins:", e);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(m => ({
        ...m,
        sender_type: m.sender_type as "user" | "ai" | "admin"
      })));
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    fetchAdmins();
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [filter, currentUserId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);

      // Subscribe to new messages
      const channel = supabase
        .channel(`admin-chat-${selectedConversation.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `conversation_id=eq.${selectedConversation.id}`,
          },
          (payload) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === (payload.new as Message).id)) return prev;
              return [...prev, payload.new as Message];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchChatBans = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_bans")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("banned_at", { ascending: false });

      if (error) throw error;
      setChatBans((data || []) as ChatBan[]);
    } catch (error) {
      console.error("Error fetching chat bans:", error);
    }
  };

  useEffect(() => {
    fetchChatBans();
  }, []);

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("admin-chat-reply", {
        body: {
          conversationId: selectedConversation.id,
          message: replyText,
        },
      });

      if (response.error) throw response.error;

      setReplyText("");
      toast({
        title: "Message sent",
        description: "Your reply has been sent to the user.",
      });
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send reply",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedConversation?.user_email) {
      toast({
        variant: "destructive",
        title: "Cannot ban user",
        description: "No email associated with this conversation",
      });
      return;
    }

    setIsBanning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      let expiresAt: Date;
      switch (banDuration) {
        case "1h":
          expiresAt = addHours(new Date(), 1);
          break;
        case "24h":
          expiresAt = addHours(new Date(), 24);
          break;
        case "7d":
          expiresAt = addDays(new Date(), 7);
          break;
        case "30d":
          expiresAt = addDays(new Date(), 30);
          break;
        case "permanent":
          expiresAt = addDays(new Date(), 365 * 10); // 10 years
          break;
        default:
          expiresAt = addHours(new Date(), 24);
      }

      const { error } = await supabase.from("chat_bans").insert({
        user_email: selectedConversation.user_email.toLowerCase(),
        banned_by: session.user.id,
        ban_reason: banReason || "Terms of service violation",
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      toast({
        title: "User banned from chat",
        description: `${selectedConversation.user_email} has been banned until ${expiresAt.toLocaleString()}`,
      });

      setShowBanDialog(false);
      setBanReason("");
      setBanDuration("24h");
      fetchChatBans();
    } catch (error) {
      console.error("Error banning user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to ban user",
      });
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnbanUser = async (banId: string, email: string) => {
    try {
      const { error } = await supabase.from("chat_bans").delete().eq("id", banId);

      if (error) throw error;

      toast({
        title: "User unbanned",
        description: `${email} can now use chat support again`,
      });
      fetchChatBans();
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unban user",
      });
    }
  };

  const handleAction = async (action: "resolve" | "close") => {
    if (!selectedConversation) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("admin-chat-reply", {
        body: {
          conversationId: selectedConversation.id,
          action,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: `Conversation ${action}d`,
        description: `The conversation has been marked as ${action}d.`,
      });

      fetchConversations();
      setSelectedConversation(null);
    } catch (error) {
      console.error(`Error ${action}ing conversation:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${action} conversation`,
      });
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedConversation || !currentUserId) return;
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ assigned_admin_id: currentUserId })
        .eq("id", selectedConversation.id);
      if (error) throw error;
      setSelectedConversation(prev => prev ? { ...prev, assigned_admin_id: currentUserId } : prev);
      toast({ title: "Assigned to you", description: "You are now handling this conversation." });
      fetchConversations();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to assign conversation" });
    }
  };

  const handleReassign = async (newAdminId: string) => {
    if (!selectedConversation) return;
    setIsReassigning(true);
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ assigned_admin_id: newAdminId })
        .eq("id", selectedConversation.id);
      if (error) throw error;
      const admin = adminList.find(a => a.id === newAdminId);
      toast({ title: "Reassigned", description: `Conversation reassigned to ${admin?.email || "admin"}` });
      setShowReassignDialog(false);
      fetchConversations();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to reassign" });
    } finally {
      setIsReassigning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "escalated":
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20"><AlertCircle className="w-3 h-3 mr-1" />Escalated</Badge>;
      case "active":
        return <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20"><Clock className="w-3 h-3 mr-1" />Active</Badge>;
      case "resolved":
        return <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      case "closed":
        return <Badge variant="secondary" className="bg-muted text-muted-foreground"><XCircle className="w-3 h-3 mr-1" />Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.user_email?.toLowerCase().includes(query) ||
      conv.user_name?.toLowerCase().includes(query) ||
      conv.id.toLowerCase().includes(query)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Conversations List */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Conversations
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchConversations} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="px-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="escalated" className="text-xs">Escalated</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">Resolved</TabsTrigger>
            <TabsTrigger value="closed" className="text-xs">Closed</TabsTrigger>
            <TabsTrigger value="assigned" className="text-xs">Mine</TabsTrigger>
          </TabsList>
        </Tabs>

        <CardContent className="flex-1 p-0 mt-3 overflow-hidden">
          <ScrollArea className="h-full">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No conversations found
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.id === conv.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {conv.user_name || conv.user_email || "Anonymous"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(conv.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedConversation ? (
          <>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedConversation.user_name || selectedConversation.user_email || "Anonymous User"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.user_email || "No email provided"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedConversation.status)}
                  {selectedConversation.user_email && (
                    <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/20 hover:bg-destructive/10"
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Ban User
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-destructive" />
                            Ban User from Chat
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p className="text-sm text-muted-foreground">
                            Ban <span className="font-medium text-foreground">{selectedConversation.user_email}</span> from chat support.
                          </p>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Ban Duration</label>
                            <Select value={banDuration} onValueChange={setBanDuration}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1h">1 Hour</SelectItem>
                                <SelectItem value="24h">24 Hours</SelectItem>
                                <SelectItem value="7d">7 Days</SelectItem>
                                <SelectItem value="30d">30 Days</SelectItem>
                                <SelectItem value="permanent">Permanent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Reason</label>
                            <Textarea
                              value={banReason}
                              onChange={(e) => setBanReason(e.target.value)}
                              placeholder="Enter reason for ban (optional)"
                              rows={3}
                            />
                          </div>
                          <Button
                            onClick={handleBanUser}
                            disabled={isBanning}
                            className="w-full bg-destructive hover:bg-destructive/90"
                          >
                            {isBanning ? "Banning..." : "Confirm Ban"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {/* Assign to me */}
                  {selectedConversation.assigned_admin_id !== currentUserId && (
                    <Button variant="outline" size="sm" onClick={handleAssignToMe}>
                      Assign to Me
                    </Button>
                  )}
                  {/* Reassign */}
                  <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">Reassign</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Reassign Conversation</DialogTitle></DialogHeader>
                      <div className="space-y-3 py-4">
                        {adminList.map(admin => (
                          <Button
                            key={admin.id}
                            variant="outline"
                            className="w-full justify-start"
                            disabled={isReassigning}
                            onClick={() => handleReassign(admin.id)}
                          >
                            {admin.email}
                          </Button>
                        ))}
                        {adminList.length === 0 && <p className="text-sm text-muted-foreground">No admins available</p>}
                      </div>
                    </DialogContent>
                  </Dialog>
                  {selectedConversation.status !== "resolved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction("resolve")}
                      className="text-primary border-primary/20 hover:bg-primary/10"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                  {selectedConversation.status !== "closed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction("close")}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Close
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${
                    msg.sender_type === "admin" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.sender_type === "user"
                        ? "bg-primary/20"
                        : msg.sender_type === "admin"
                        ? "bg-accent/30"
                        : "bg-muted"
                    }`}
                  >
                    {msg.sender_type === "user" ? (
                      <User className="w-4 h-4 text-primary" />
                    ) : msg.sender_type === "admin" ? (
                      <Headphones className="w-4 h-4 text-accent-foreground" />
                    ) : (
                      <Bot className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] p-3 rounded-lg text-sm ${
                      msg.sender_type === "admin"
                        ? "bg-accent/20 border border-accent/30"
                        : msg.sender_type === "user"
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground mb-1 capitalize">
                      {msg.sender_type} • {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                  placeholder="Type your reply..."
                  disabled={isSending}
                  className="flex-1"
                />
                <Button
                  onClick={sendReply}
                  disabled={!replyText.trim() || isSending}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminChatManagement;
