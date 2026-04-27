import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type RuleRow = {
  program_type: string;
  account_size: number;
  profit_target_phase1: number;
  profit_target_phase2: number | null;
  daily_drawdown: number;
  max_drawdown: number;
  min_trading_days: number;
  leverage: string | null;
};

type FaqRow = {
  question: string;
  answer: string;
  category: string;
  sub_category: string | null;
};

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "what", "when", "where", "which", "your", "about",
  "have", "will", "does", "dont", "into", "want", "need", "there", "they", "them", "how", "can", "you",
  "are", "our", "any", "all", "too", "not", "its", "was", "were", "his", "her", "she", "him", "has",
]);

const extractKeywords = (message: string) => {
  const unique = new Set(
    message
      .toLowerCase()
      .replace(/[^a-z0-9%\s-]/g, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
  );

  const fullMessage = message.toLowerCase();

  if (fullMessage.includes("best day") || fullMessage.includes("40%") || fullMessage.includes("consisten")) {
    unique.add("consistency");
    unique.add("best");
    unique.add("day");
    unique.add("40%");
  }

  return Array.from(unique);
};

const buildRulesKnowledge = (rules: RuleRow[]) => {
  if (!rules.length) return "No live rules data available.";

  const grouped = new Map<string, RuleRow[]>();
  for (const rule of rules) {
    if (!grouped.has(rule.program_type)) grouped.set(rule.program_type, []);
    grouped.get(rule.program_type)!.push(rule);
  }

  const toUnique = (arr: Array<number | string | null>) =>
    Array.from(new Set(arr.filter((value): value is number | string => value !== null && value !== undefined)));

  const lines: string[] = [];

  for (const [programType, entries] of grouped.entries()) {
    const accountSizes = toUnique(entries.map((entry) => Number(entry.account_size))).sort((a, b) => Number(a) - Number(b));
    const phase1Targets = toUnique(entries.map((entry) => Number(entry.profit_target_phase1)));
    const phase2Targets = toUnique(entries.map((entry) => entry.profit_target_phase2 !== null ? Number(entry.profit_target_phase2) : null));
    const dailyLimits = toUnique(entries.map((entry) => Number(entry.daily_drawdown)));
    const maxLimits = toUnique(entries.map((entry) => Number(entry.max_drawdown)));
    const minDays = toUnique(entries.map((entry) => Number(entry.min_trading_days)));
    const leverages = toUnique(entries.map((entry) => entry.leverage));

    lines.push(
      `${programType}: account sizes ${accountSizes.join(", ")}; phase 1 target ${phase1Targets
        .map((value) => `${value}%`)
        .join("/")}; phase 2 target ${phase2Targets.length ? phase2Targets.map((value) => `${value}%`).join("/") : "N/A"}; daily drawdown ${dailyLimits
        .map((value) => `${value}%`)
        .join("/")}; max drawdown ${maxLimits.map((value) => `${value}%`).join("/")}; min trading days ${minDays.join("/")}; leverage ${leverages.join("/")}.`
    );
  }

  return lines.join("\n");
};

const buildRelevantFaqKnowledge = (message: string, faqs: FaqRow[]) => {
  if (!faqs.length) return "No FAQ entries available.";

  const keywords = extractKeywords(message);

  const scored = faqs
    .map((faq) => {
      const haystack = `${faq.question} ${faq.answer} ${faq.category} ${faq.sub_category ?? ""}`.toLowerCase();
      const score = keywords.reduce((total, keyword) => (haystack.includes(keyword) ? total + 1 : total), 0);
      return { faq, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (!scored.length) {
    return "No directly matched FAQ found for this question.";
  }

  return scored
    .map(({ faq }) => `Q: ${faq.question}\nA: ${faq.answer}`)
    .join("\n\n");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId, userId, userEmail, userName, isAnonymous } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is banned from chat
    if (userEmail) {
      const { data: activeBan } = await supabase
        .from("chat_bans")
        .select("id, expires_at, ban_reason")
        .eq("user_email", userEmail.toLowerCase())
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .single();

      if (activeBan) {
        const expiresAt = new Date(activeBan.expires_at);
        const formattedExpiry = expiresAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return new Response(
          JSON.stringify({
            message: `You have been temporarily banned from chat support due to terms of service violations. Your ban expires on ${formattedExpiry}. If you believe this is an error, please contact support@kuberamarkets.com`,
            conversationId: null,
            banned: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Profanity detection - common swear words and variations
    const profanityPatterns = [
      /\bf+u+c+k+/gi, /\bs+h+i+t+/gi, /\ba+s+s+h+o+l+e+/gi, /\bb+i+t+c+h+/gi,
      /\bd+a+m+n+/gi, /\bc+u+n+t+/gi, /\bd+i+c+k+/gi, /\bp+i+s+s+/gi,
      /\bw+h+o+r+e+/gi, /\bb+a+s+t+a+r+d+/gi, /\bf+a+g+/gi, /\bn+i+g+g+/gi,
      /\bstfu\b/gi, /\bwtf\b/gi, /\bffs\b/gi, /\bfu\b/gi,
    ];

    const containsProfanity = profanityPatterns.some((pattern) => pattern.test(message));

    if (containsProfanity) {
      let activeConversationId = conversationId;

      // Create conversation if needed for tracking
      if (!activeConversationId) {
        const { data: newConversation } = await supabase
          .from("conversations")
          .insert({
            user_id: userId || null,
            user_email: userEmail || null,
            user_name: userName || null,
            is_anonymous: isAnonymous || false,
            status: "active",
          })
          .select()
          .single();
        activeConversationId = newConversation?.id;
      }

      // Save the user message (even if profane, for records)
      if (activeConversationId) {
        await supabase.from("chat_messages").insert({
          conversation_id: activeConversationId,
          sender_type: "user",
          sender_id: userId || null,
          content: message,
        });

        const warningMessage = "Please keep the conversation respectful. Using inappropriate language violates our terms of service and continued violations may result in your account being suspended or banned. How can I help you today?";
        await supabase.from("chat_messages").insert({
          conversation_id: activeConversationId,
          sender_type: "ai",
          content: warningMessage,
        });
      }

      return new Response(
        JSON.stringify({
          message: "Please keep the conversation respectful. Using inappropriate language violates our terms of service and continued violations may result in your account being suspended or banned. How can I help you today?",
          conversationId: activeConversationId,
          warning: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let activeConversationId = conversationId;

    // Create or get conversation
    if (!activeConversationId) {
      const { data: newConversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: userId || null,
          user_email: userEmail || null,
          user_name: userName || null,
          is_anonymous: isAnonymous || false,
          status: "active",
        })
        .select()
        .single();

      if (convError) {
        console.error("Error creating conversation:", convError);
        return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      activeConversationId = newConversation.id;
    }

    // Save user message
    const { error: userMsgError } = await supabase.from("chat_messages").insert({
      conversation_id: activeConversationId,
      sender_type: "user",
      sender_id: userId || null,
      content: message,
    });

    if (userMsgError) {
      console.error("Error saving user message:", userMsgError);
    }

    // Get conversation history and live knowledge context
    const [{ data: history }, { data: rulesData }, { data: faqsData }] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("sender_type, content")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true })
        .limit(100),
      supabase
        .from("rules")
        .select("program_type, account_size, profit_target_phase1, profit_target_phase2, daily_drawdown, max_drawdown, min_trading_days, leverage"),
      supabase
        .from("faqs")
        .select("question, answer, category, sub_category")
        .eq("is_active", true),
    ]);

    const rulesKnowledge = buildRulesKnowledge((rulesData ?? []) as RuleRow[]);
    const faqKnowledge = buildRelevantFaqKnowledge(message, (faqsData ?? []) as FaqRow[]);

    const messages = [
      {
        role: "system",
        content: `You are a helpful customer support assistant for Kubera Markets, a prop trading firm and CFD broker.

General product context:
- Programs include 1-step, 2-step, and halfway.
- Typical funded profit split is 80% for traders.
- Evaluation account sizes range from 5K to 200K.

Use the live rules and FAQ context below as your primary source of truth. If context includes the answer, give it directly and clearly.

LIVE RULES CONTEXT:
${rulesKnowledge}

RELEVANT FAQ CONTEXT:
${faqKnowledge}

Guidelines:
1. Be friendly, professional, and concise.
2. If live context includes the answer, prioritize it over generic guidance.
3. If the question is complex, requires account-specific information, or you are unsure, offer to connect them with a live agent.
4. For account-specific issues (payouts, account status, verification), offer to connect them with a live agent.
5. Never make up information. If unsure, say so.
6. IMPORTANT: Write in plain text only. Do NOT use markdown formatting.
7. When asked about consistency rules, specifically check for 40% Best Day Rule details in FAQ context before answering.

CRITICAL: When a user asks to speak to a human, live person, real agent, or wants human support:
- Respond with [ESCALATE] at the start of your message.
- Tell them you are connecting them with a live support agent right now.
- Let them know an agent will respond shortly in this same chat.

If the user wants to speak to a human or their issue requires human intervention, respond with [ESCALATE] at the start of your message.`,
      },
    ];

    // Add conversation history
    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({
          role: msg.sender_type === "user" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }

    // Current message
    messages.push({ role: "user", content: message });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required for AI usage. Please top up your workspace credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let aiMessage = aiData.choices?.[0]?.message?.content || "I apologize, but I'm having trouble responding. Please try again.";

    // Check if escalation is needed (AI flagged OR user used contact/human keywords)
    const contactKeywords = /\b(contact\s*us|speak\s*to\s*(a\s*)?(human|person|agent|someone)|talk\s*to\s*(a\s*)?(human|person|agent|someone)|real\s*(person|agent|human)|live\s*(agent|support|person|chat)|need\s*help\s*from|want\s*to\s*talk|get\s*in\s*touch)\b/i;
    const userWantsHuman = contactKeywords.test(message);

    const shouldEscalate = aiMessage.includes("[ESCALATE]") || userWantsHuman;
    if (shouldEscalate) {
      aiMessage = aiMessage.replace("[ESCALATE]", "").trim();

      await supabase
        .from("conversations")
        .update({ status: "escalated", escalated_at: new Date().toISOString() })
        .eq("id", activeConversationId);

      const ticketUserId = userId || "00000000-0000-0000-0000-000000000000";
      if (userId) {
        await supabase.from("tickets").insert({
          user_id: ticketUserId,
          subject: `Live Agent Request - ${(userEmail || userName || "Guest").substring(0, 40)}`,
          message: `User requested human/live support.\n\nEmail: ${userEmail || "Unknown"}\nName: ${userName || "Unknown"}\nLast message: "${message}"`,
          status: "open",
          priority: "high",
        });
      }

      console.log(`[ESCALATION] conversation=${activeConversationId} user=${userEmail || "guest"} reason=${userWantsHuman ? "contact_keyword" : "ai_escalate"}`);
    }

    const { error: aiMsgError } = await supabase.from("chat_messages").insert({
      conversation_id: activeConversationId,
      sender_type: "ai",
      content: aiMessage,
    });

    if (aiMsgError) {
      console.error("Error saving AI message:", aiMsgError);
    }

    return new Response(
      JSON.stringify({
        message: aiMessage,
        conversationId: activeConversationId,
        escalated: shouldEscalate,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});