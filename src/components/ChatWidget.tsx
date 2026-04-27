import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Minimize2, User, Bot, Headphones, Sparkles, Zap, ArrowLeft, Clock, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import useNotificationSound from "@/hooks/use-notification-sound";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Format message timestamp
const formatMessageTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface Message {
  id: string;
  content: string;
  sender_type: "user" | "ai" | "admin";
  created_at: string;
}

interface ConversationSummary {
  id: string;
  created_at: string;
  status: string;
  lastMessage?: string;
}

interface GuestInfo {
  name: string;
  email: string;
}

type ChatView = "intro" | "history" | "chat";

const ChatWidget = () => {
  const location = useLocation();
  const themeColors = {
    gradient: "bg-gradient-to-br from-primary via-primary to-accent",
    headerGradient: "bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10",
    iconBg: "bg-gradient-to-br from-primary to-accent",
    pulse: "bg-primary",
    accent: "text-accent",
    button: "bg-primary hover:bg-primary/90",
    shadow: "hover:shadow-primary/30",
    softText: "text-primary/50",
  };

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [view, setView] = useState<ChatView>("intro");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isEscalated, setIsEscalated] = useState(false);
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const historyCacheRef = useRef<{
    email: string;
    fetchedAt: number;
    conversations: ConversationSummary[];
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { playNotificationSound } = useNotificationSound();
  const [isTyping, setIsTyping] = useState(false);

  // Check auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // When widget opens, determine which view to show
  useEffect(() => {
    if (isOpen) {
      // Always check localStorage first for saved guest info
      const savedGuest = localStorage.getItem("kubera_chat_guest");
      if (savedGuest) {
        try {
          const parsed = JSON.parse(savedGuest);
          setGuestInfo(parsed);
          setGuestName(parsed.name);
          setGuestEmail(parsed.email);
          setView("history");
          // Load immediately using parsed email (avoid waiting for state updates)
          loadConversationHistory(parsed.email);
        } catch {
          // Invalid data, clear and show intro
          localStorage.removeItem("kubera_chat_guest");
          setView("intro");
        }
      } else {
        // No saved info - always show intro to collect name/email
        setView("intro");
        // Pre-fill if user is logged in
        if (user) {
          setGuestName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
          setGuestEmail(user.email || "");
        }
      }
    }
  }, [isOpen, user]);

  // Load conversation history
  const loadConversationHistory = async (emailOverride?: string) => {
    setLoadingHistory(true);
    try {
      const email = emailOverride || user?.email || guestInfo?.email;
      if (!email) return;

      // Small cache to keep the UI snappy when opening/closing the widget.
      // (Avoids repeated network calls when nothing changed.)
      const cached = historyCacheRef.current;
      const now = Date.now();
      if (cached && cached.email === email && now - cached.fetchedAt < 30_000) {
        setConversations(cached.conversations);
        return;
      }

      const { data, error } = await supabase
        .from("conversations")
        .select("id, created_at, status")
        .eq("user_email", email)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const convs = (data || []) as Omit<ConversationSummary, "lastMessage">[];
      const ids = convs.map((c) => c.id);

      // Fetch last messages in ONE call (instead of 1 per conversation)
      const lastMessageByConversationId: Record<string, string> = {};
      if (ids.length) {
        const { data: msgs, error: msgsError } = await supabase
          .from("chat_messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false })
          .limit(200);

        if (msgsError) throw msgsError;

        (msgs || []).forEach((m) => {
          const convId = (m as any).conversation_id as string;
          if (!lastMessageByConversationId[convId]) {
            lastMessageByConversationId[convId] = (m as any).content as string;
          }
        });
      }

      const conversationsWithMessages: ConversationSummary[] = convs.map((c) => ({
        ...c,
        lastMessage: lastMessageByConversationId[c.id] || "No messages",
      }));

      setConversations(conversationsWithMessages);
      historyCacheRef.current = {
        email,
        fetchedAt: Date.now(),
        conversations: conversationsWithMessages,
      };
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load specific conversation
  const loadConversation = async (convId: string) => {
    setConversationId(convId);
    setView("chat");
    setIsLoading(true);

    try {
      const [{ data, error }, { data: conv, error: convError }] = await Promise.all([
        supabase
          .from("chat_messages")
          .select("id, content, sender_type, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true }),
        supabase.from("conversations").select("status").eq("id", convId).single(),
      ]);

      if (error) throw error;
      if (convError) throw convError;

      setMessages(
        (data || []).map((m) => ({
          ...m,
          sender_type: m.sender_type as "user" | "ai" | "admin",
        }))
      );

      if (conv?.status === "escalated") {
        setIsEscalated(true);
      } else {
        setIsEscalated(false);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to new messages via realtime
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            // Skip if we already have this exact message
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            // Remove any temp messages with same content to avoid duplicates
            const filtered = prev.filter(
              (m) => !(m.id.startsWith("temp-") && m.content === newMessage.content && m.sender_type === newMessage.sender_type)
            );
            
            // Play notification sound for non-user messages
            if (newMessage.sender_type !== "user") {
              playNotificationSound();
            }
            
            return [...filtered, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, playNotificationSound]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleGuestSubmit = () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Required",
        description: "Please enter your name and email",
      });
      return;
    }

    const info = { name: guestName.trim(), email: guestEmail.trim() };
    setGuestInfo(info);
    localStorage.setItem("kubera_chat_guest", JSON.stringify(info));
    setView("history");
    loadConversationHistory(info.email);
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setIsEscalated(false);
    setView("chat");
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        content: userMessage,
        sender_type: "user",
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const response = await supabase.functions.invoke("chat-ai", {
        body: {
          message: userMessage,
          conversationId,
          userId: user?.id,
          userEmail: user?.email || guestInfo?.email,
          userName: user?.user_metadata?.full_name || guestInfo?.name,
          isAnonymous: !user,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      const isFirstMessage = !conversationId;

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      if (data.escalated) {
        setIsEscalated(true);
      }

      if (isFirstMessage) {
        setMessages((prev) =>
          prev.filter((m) => m.id !== tempId).concat([
            {
              id: `user-${Date.now()}`,
              content: userMessage,
              sender_type: "user",
              created_at: new Date().toISOString(),
            },
            {
              id: `ai-${Date.now()}`,
              content: data.message,
              sender_type: "ai",
              created_at: new Date().toISOString(),
            },
          ])
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 ${themeColors.gradient} text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 ${themeColors.shadow} group animate-pulse hover:animate-none`}
      >
        <div className="relative">
          <Zap className="w-7 h-7 transition-transform group-hover:scale-110" />
          <Sparkles className={`w-3 h-3 absolute -top-1 -right-1 ${themeColors.accent} animate-bounce`} />
        </div>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-card border border-border rounded-xl shadow-2xl flex flex-col transition-all ${
        isMinimized ? "h-14" : "h-[500px] max-h-[80vh]"
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b border-border ${themeColors.headerGradient} rounded-t-xl`}>
        <div className="flex items-center gap-3">
          {view === "chat" && (
            <button
              onClick={() => {
                setView("history");
                loadConversationHistory();
              }}
              className="p-1 hover:bg-muted rounded"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="relative">
            <div className={`w-10 h-10 ${themeColors.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${isEscalated ? 'bg-green-500' : themeColors.pulse} animate-pulse`}></span>
          </div>
          <div>
            <p className="font-bold text-sm flex items-center gap-1.5">
              Kubera AI
              <Sparkles className={`w-3.5 h-3.5 ${themeColors.accent}`} />
            </p>
            <p className="text-xs text-muted-foreground">
              {view === "intro" ? "Let's get started" : isEscalated ? "🟢 Connected to Agent" : "⚡ Lightning-fast support"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-muted rounded"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              setIsMinimized(false);
            }}
            className="p-1.5 hover:bg-muted rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Intro View - Ask for name/email */}
          {view === "intro" && (
            <div className="flex-1 p-6 flex flex-col justify-center">
              <div className="text-center mb-6">
                <Bot className={`w-12 h-12 ${themeColors.softText} mx-auto mb-3`} />
                <h3 className="font-bold text-lg">Welcome to Kubera Support</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Please enter your details to start chatting
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Your Name</label>
                  <Input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Your Email</label>
                  <Input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <Button onClick={handleGuestSubmit} className={`w-full ${themeColors.button}`}>
                  Start Chatting
                </Button>
              </div>

              {user && (
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Logged in as {user.email}
                </p>
              )}
            </div>
          )}

          {/* History View - Show past conversations */}
          {view === "history" && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <Button
                  onClick={startNewConversation}
                  className={`w-full mb-4 ${themeColors.button}`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Conversation
                </Button>

                {loadingHistory ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border animate-pulse">
                        <div className="flex items-center justify-between mb-2">
                          <div className="h-3 w-16 bg-muted rounded" />
                          <div className="h-4 w-14 bg-muted rounded" />
                        </div>
                        <div className="h-4 w-3/4 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No previous conversations</p>
                    <p className="text-xs text-muted-foreground mt-1">Start a new chat above!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Recent Conversations</p>
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(conv.created_at)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            conv.status === "escalated" ? "bg-accent/20 text-accent" :
                            conv.status === "resolved" ? "bg-primary/20 text-primary" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {conv.status}
                          </span>
                        </div>
                        <p className="text-sm truncate">{conv.lastMessage}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat View */}
          {view === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading && messages.length === 0 ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={`flex items-start gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                        <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
                        <div className={`max-w-[75%] space-y-2 ${i % 2 === 0 ? "" : "flex flex-col items-end"}`}>
                          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className={`w-12 h-12 mx-auto mb-3 ${themeColors.softText}`} />
                    <p className="text-sm text-muted-foreground">
                      Hi{guestInfo?.name ? ` ${guestInfo.name.split(" ")[0]}` : ""}! How can I help you today?
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ask about our trading programs, account questions, or anything else.
                    </p>
                  </div>
                ) : null}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${
                      msg.sender_type === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.sender_type === "user"
                          ? "bg-primary/20"
                          : msg.sender_type === "admin"
                          ? "bg-accent/20"
                          : "bg-muted"
                      }`}
                    >
                      {msg.sender_type === "user" ? (
                        <User className="w-3.5 h-3.5 text-primary" />
                      ) : msg.sender_type === "admin" ? (
                        <Headphones className="w-3.5 h-3.5 text-accent" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className={`max-w-[75%] ${msg.sender_type === "user" ? "text-right" : ""}`}>
                      <div
                        className={`p-3 rounded-lg text-sm ${
                          msg.sender_type === "user"
                            ? "bg-primary text-primary-foreground"
                            : msg.sender_type === "admin"
                            ? "bg-accent/10 border border-accent/20"
                            : "bg-muted"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className={`text-[10px] text-muted-foreground mt-1 block ${
                        msg.sender_type === "user" ? "text-right" : "text-left"
                      }`}>
                        {formatMessageTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="flex gap-1 items-center">
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
                        <span className="text-xs text-muted-foreground ml-2">Typing...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    size="icon"
                    className={themeColors.button}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {isEscalated && (
                  <p className="text-xs text-accent mt-2 text-center">
                    Your chat has been escalated. A support agent will respond soon.
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ChatWidget;