import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { crypto as stdCrypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

async function md5(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await stdCrypto.subtle.digest("MD5", msgBuffer);
  return new TextDecoder().decode(hexEncode(new Uint8Array(hashBuffer)));
}

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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, challengeId, userId } = body;
    const targetUserId = userId || user.id;

    if (!action || !challengeId) {
      return new Response(JSON.stringify({ error: "action and challengeId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const WCT_BASE_URL = "https://backapi.kuberaglobalmarkets.com/api/v1/createPaymentLink";
    const WCT_API_KEY = Deno.env.get("WCT_API_KEY")!;
    const WCT_API_SECRET = Deno.env.get("WCT_API_SECRET")!;
    const ASSET = "USD";
    const POSTBACK_URL = `${supabaseUrl}/functions/v1/wct-callback`;
    // ✅ FIX: use real production domain, not lovable.app
    const REDIRECT_URL = "https://www.kuberaglobalmarkets.com/prop/payments";

    if (action === "createPaymentLink") {
      // Fetch the payment order to get amount, program_type, account_size, etc.
      const { data: order, error: orderErr } = await supabase
        .from("payment_orders")
        .select("*")
        .eq("id", challengeId)
        .single();

      if (orderErr || !order) {
        console.error("Could not find payment order:", orderErr);
        return new Response(JSON.stringify({ error: "Payment order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amount = order.amount;
      const email = order.email || user.email || "";
      const orderRef = order.order_reference;

      // Build cart_items: "item_name,item_desc,item_quantity,unit_price"
      const cartStr = `${orderRef},${order.program_type},1,${amount}`;
      const cartItems = [cartStr];

      // Compute MD5 hash: MD5(key + asset + amount + api_secret)
      const hashInput = `${WCT_API_KEY}${ASSET}${String(amount)}${WCT_API_SECRET}`;
      const hashComputed = await md5(hashInput);

      // Build form-encoded body
      const formData = new URLSearchParams();
      formData.append("currency", ASSET);
      formData.append("amount", String(amount));
      formData.append("email", email);
      formData.append("description", "funding");
      formData.append("invoice_id", "null");              // ✅ FIX: match working request format
      formData.append("api_key", WCT_API_KEY);
      formData.append("hash", hashComputed);
      formData.append("settlement_currency", ASSET);
      formData.append("postback_url", POSTBACK_URL);
      formData.append("return_url", REDIRECT_URL);
      cartItems.forEach((item, i) => formData.append(`cart_items[${i}]`, item));
      formData.append("userId", targetUserId);            // ✅ FIX: was missing
      formData.append("challengeId", order.id);          // ✅ FIX: was missing

      console.log("WCT request URL:", WCT_BASE_URL);
      console.log("WCT request body:", formData.toString());

      let response: Response;
      try {
        response = await fetch(WCT_BASE_URL, {
          method: "POST",
          headers: { 
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });
      } catch (fetchErr) {
        console.error("WCT gateway unreachable:", fetchErr);
        return new Response(
          JSON.stringify({ success: false, gatewayUnavailable: true, error: "Payment gateway is currently unavailable. Please try again shortly." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const responseText = await response.text();
      console.log("WCT response status:", response.status);
      console.log("WCT response body:", responseText);

      if (!response.ok) {
        console.error("WCT startPayment error:", responseText);
        return new Response(JSON.stringify({ success: false, gatewayUnavailable: true, error: "Failed to create payment link", details: responseText }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // The response may contain HTTP headers before the JSON body - extract just the JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        // Try to find JSON object in the response text (headers may be prepended)
        const jsonMatch = responseText.match(/\{[\s\S]*\}$/);
        if (jsonMatch) {
          try { data = JSON.parse(jsonMatch[0]); } catch { data = responseText.trim(); }
        } else {
          data = responseText.trim();
        }
      }

      // Check WCT response status
      if (data?.status !== "ok") {
        console.error("WCT payment creation failed:", data);
        return new Response(JSON.stringify({ success: false, gatewayUnavailable: true, error: data?.message || data?.error || "Payment creation failed", details: data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paymentUrl = (data?.payment_url || "").toString().trim();
      
      if (!paymentUrl || !paymentUrl.startsWith("http")) {
        console.error("WCT returned invalid payment URL:", paymentUrl);
        return new Response(JSON.stringify({ success: false, gatewayUnavailable: true, error: "Gateway returned an invalid payment URL. Please try again or contact support." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract invoiceId from payment_url query string
      let paymentId = data?.paymentId || "";
      try {
        const urlObj = new URL(paymentUrl);
        const invoiceId = urlObj.searchParams.get("invoiceId");
        if (invoiceId) {
          paymentId = invoiceId;
        }
      } catch (e) {
        console.warn("Could not parse invoiceId from payment URL:", e);
      }

      if (paymentId || paymentUrl) {
        await supabase.from("payment_orders").update({ 
          wct_payment_id: paymentId || null, 
          wct_payment_url: paymentUrl 
        }).eq("id", order.id);
      }
      
      return new Response(JSON.stringify({ success: true, paymentUrl, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // doWithdrawal has been moved to manage-condor-account edge function

    if (action === "sendCertificateNotice") {
      const response = await fetch(`${WCT_BASE_URL}/sendCertificateNotice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ $user: targetUserId, $challenge: challengeId }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: "Failed to send certificate notice", details: errText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sendEmail") {
      const { message, subject } = body;
      const response = await fetch(`${WCT_BASE_URL}/sendEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ $user: targetUserId, $message: message, $subject: subject }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: "Failed to send email", details: errText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WCT payment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
