import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversationId, message, action } = await req.json();

    if (!conversationId) {
      return new Response(JSON.stringify({ error: "Conversation ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle different actions
    if (action === "resolve") {
      await supabase
        .from("conversations")
        .update({ 
          status: "resolved", 
          resolved_at: new Date().toISOString(),
          assigned_admin_id: user.id 
        })
        .eq("id", conversationId);

      return new Response(JSON.stringify({ success: true, action: "resolved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "close") {
      await supabase
        .from("conversations")
        .update({ status: "closed", assigned_admin_id: user.id })
        .eq("id", conversationId);

      return new Response(JSON.stringify({ success: true, action: "closed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send admin reply
    if (!message) {
      return new Response(JSON.stringify({ error: "Message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update conversation status and assign admin
    await supabase
      .from("conversations")
      .update({ 
        status: "active",
        assigned_admin_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", conversationId);

    // Insert admin message
    const { data: msgData, error: msgError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender_type: "admin",
        sender_id: user.id,
        content: message,
      })
      .select()
      .single();

    if (msgError) {
      console.error("Error inserting admin message:", msgError);
      return new Response(JSON.stringify({ error: "Failed to send message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: msgData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
