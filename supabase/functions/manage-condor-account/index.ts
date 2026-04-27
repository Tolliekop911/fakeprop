import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_API_URL = "https://backapi.kuberaglobalmarkets.com/api/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = userData.user.id;

    // Check admin/root/moderator role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .in("role", ["admin", "root", "moderator"])
      .limit(1)
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, accountId, challengeId, payoutId } = body;

    // For enable/disable, we need the challengeId (that's what Condor knows)
    // For doWithdrawal, we use accountId for amount lookup but challengeId for the API call
    const condorId = challengeId || accountId;

    if (!action || !condorId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action, and either challengeId or accountId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action !== "enable" && action !== "disable" && action !== "doWithdrawal") {
      return new Response(
        JSON.stringify({ error: "Action must be 'enable', 'disable', or 'doWithdrawal'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let endpoint: string;
    let payload: Record<string, unknown>;

    if (action === "doWithdrawal") {
      // Fetch payout to get the full withdrawal amount (100% of profit)
      let withdrawalAmount = 0;

      if (payoutId) {
        const { data: payoutData } = await supabase
          .from("payouts")
          .select("amount, full_amount, account_id")
          .eq("id", payoutId)
          .single();

        if (payoutData) {
          withdrawalAmount = payoutData.full_amount || (payoutData.amount / 0.8);
        }
      }

      endpoint = "doWithdrawal";
      payload = { id: condorId, amount: withdrawalAmount };
    } else {
      endpoint = action === "enable" ? "enableAccount" : "disableAccount";
      payload = { id: condorId };
    }

    const url = `${BASE_API_URL}/${endpoint}`;

    console.log(`Calling ${endpoint} for condorId=${condorId} (source: ${challengeId ? "challengeId" : "accountId"})`, JSON.stringify(payload));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let externalResponse: Response;
    try {
      externalResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const isTimeout = fetchErr instanceof DOMException && fetchErr.name === "AbortError";
      console.error(`${endpoint} fetch failed (timeout=${isTimeout}):`, fetchErr);
      return new Response(
        JSON.stringify({ success: false, error: isTimeout ? "Condor API timed out after 15s" : "Condor API unreachable", details: String(fetchErr) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    clearTimeout(timeoutId);

    const responseText = await externalResponse.text();
    let responseData: Record<string, unknown> = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log(`${endpoint} response [${externalResponse.status}]:`, JSON.stringify(responseData));

    if (responseData.status === "error") {
      return new Response(
        JSON.stringify({ success: false, error: "External API returned error", details: responseData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("manage-condor-account error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
