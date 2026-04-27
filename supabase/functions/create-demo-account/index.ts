import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTERNAL_API_URL = "https://backapi.kuberaglobalmarkets.com/api/v1/createDemoAccount";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, first_name, email")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { accountSize } = await req.json();

    if (!accountSize || typeof accountSize !== "number" || accountSize <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid account size" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating demo account: userId=${userId}, profileId=${profile.id}, accountSize=${accountSize}`);

    // Call external API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        profile_id: profile.id,
        accountSize,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseText = await externalResponse.text();
    let parsedResponse: unknown = null;

    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      parsedResponse = { raw: responseText };
    }

    console.log(`Demo API response [${externalResponse.status}]:`, responseText);

    if (!externalResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "External API call failed",
          status: externalResponse.status,
          details: parsedResponse,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save demo account to database
    await supabase.from("demo_accounts").insert({
      user_id: userId,
      account_size: accountSize,
      api_response: parsedResponse,
    });

    return new Response(JSON.stringify({ success: true, data: parsedResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-demo-account error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
