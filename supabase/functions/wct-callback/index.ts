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

// Determine starting phase based on program type
function getStartingPhase(programType: string): { phase: string; profitTargetPercent: number } {
  // All programs start at phase1 evaluation
  // 1-step has single phase, 2-step has phase1 then phase2
  return {
    phase: "phase1",
    profitTargetPercent: 8,
  };
}

// Auto-provision account and challenge for a paid order
async function provisionAccount(
  supabase: ReturnType<typeof createClient>,
  order: Record<string, any>
) {
  const size = order.account_size;
  const programType = order.program_type || "1-step";
  const accountNumber = `PROP-${Date.now().toString().slice(-6)}`;
  const { phase, profitTargetPercent } = getStartingPhase(programType);

  // Create account
  const { error: accountError, data: accountData } = await supabase
    .from("accounts")
    .insert({
      user_id: order.user_id,
      account_number: accountNumber,
      account_type: "prop",
      account_size: size,
      balance: size,
      equity: size,
      status: "active",
      phase: "evaluation",
      program_type: programType.replace("halfway-", ""),
    })
    .select()
    .single();

  if (accountError) {
    console.error("Failed to create account:", accountError);
    throw new Error(`Account creation failed: ${accountError.message}`);
  }

  // Create challenge
  const challengeNumber = `CH-${Date.now().toString().slice(-8)}`;
  const profitTargetAmount = size * (profitTargetPercent / 100);

  const { error: challengeError } = await supabase.from("challenges").insert({
    user_id: order.user_id,
    account_id: accountData.id,
    challenge_number: challengeNumber,
    program_type: programType.replace("halfway-", ""),
    account_size: size,
    current_balance: size,
    profit_target_percent: profitTargetPercent,
    profit_target_amount: profitTargetAmount,
    max_drawdown_percent: 10,
    max_drawdown_amount: size * 0.10,
    phase: phase,
    status: "active",
  });

  if (challengeError) {
    console.error("Failed to create challenge:", challengeError);
    throw new Error(`Challenge creation failed: ${challengeError.message}`);
  }

  // Call external createChallengeAccount API
  try {
    // Fetch profile_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", order.user_id)
      .single();

    if (profile) {
      const EXTERNAL_API_URL = "https://backapi.kuberaglobalmarkets.com/api/v1/createChallengeAccount";
      const extResponse = await fetch(EXTERNAL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: order.user_id,
          profile_id: profile.id,
          paymentOrderID: order.id,
        }),
      });
      const extText = await extResponse.text();
      console.log(`External createChallengeAccount [${extResponse.status}]:`, extText);
    } else {
      console.warn("No profile found for user, skipping external API call");
    }
  } catch (extError) {
    console.error("External createChallengeAccount failed (non-blocking):", extError);
  }

  console.log(`Auto-provisioned account ${accountNumber} for order ${order.order_reference}`);
  return { accountNumber, accountData };
}

// Send email via SendGrid
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
) {
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  if (!SENDGRID_API_KEY) {
    console.error("SENDGRID_API_KEY not configured, skipping email");
    return;
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "support@kuberamarkets.com", name: "Kubera Markets" },
      subject,
      content: [{ type: "text/html", value: htmlContent }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`SendGrid error [${response.status}]:`, errorText);
  } else {
    // Consume the response body
    await response.text();
    console.log(`Email sent to ${to}: ${subject}`);
  }
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Build payment success email
function buildSuccessEmail(order: Record<string, any>, accountNumber: string): string {
  const name = order.full_name || order.email || "Trader";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 30px; border-radius: 12px; color: white; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🎉 Payment Confirmed!</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Your trading account is ready</p>
      </div>
      <div style="padding: 30px 20px;">
        <p>Hi ${name},</p>
        <p>Your payment of <strong>${formatMoney(order.amount)}</strong> has been successfully processed. Your trading account has been automatically created and is ready to use.</p>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px; color: #333;">Account Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Account Number</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${accountNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Account Size</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${formatMoney(order.account_size)}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Program</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${(order.program_type || "1-step").toUpperCase()}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Order Reference</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${order.order_reference}</td></tr>
          </table>
        </div>
        <p>Log in to your dashboard to start trading. Good luck!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://kuberamarkets.lovable.app/prop/login" style="background: #4f46e5; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Go to Dashboard</a>
        </div>
      </div>
      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>Kubera Capital Markets • support@kuberamarkets.com</p>
      </div>
    </div>
  `;
}

// Build payment failed email
function buildFailedEmail(order: Record<string, any>): string {
  const name = order.full_name || order.email || "Trader";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #7f1d1d, #991b1b); padding: 30px; border-radius: 12px; color: white; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Payment Unsuccessful</h1>
      </div>
      <div style="padding: 30px 20px;">
        <p>Hi ${name},</p>
        <p>Unfortunately, your payment of <strong>${formatMoney(order.amount)}</strong> for a ${formatMoney(order.account_size)} ${(order.program_type || "").toUpperCase()} account could not be processed.</p>
        <p>Order Reference: <strong>${order.order_reference}</strong></p>
        <p>Please try again or contact our support team if you need assistance.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://kuberamarkets.lovable.app/prop/choose-challenge" style="background: #4f46e5; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Try Again</a>
        </div>
      </div>
      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>Kubera Capital Markets • support@kuberamarkets.com</p>
      </div>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const WCT_API_SECRET = Deno.env.get("WCT_API_SECRET")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse callback data
    let callbackData: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.text();
      const params = new URLSearchParams(formData);
      for (const [key, value] of params.entries()) {
        callbackData[key] = value;
      }
    } else if (contentType.includes("application/json")) {
      callbackData = await req.json();
    } else {
      const bodyText = await req.text();
      try {
        callbackData = JSON.parse(bodyText);
      } catch {
        const params = new URLSearchParams(bodyText);
        for (const [key, value] of params.entries()) {
          callbackData[key] = value;
        }
      }
    }

    console.log("WCT Callback received:", JSON.stringify(callbackData));

    const invoiceId = callbackData.invoice_id || callbackData.invoiceId || callbackData.order_id || callbackData.orderId || "";
    const status = callbackData.status || callbackData.payment_status || "";
    const transactionId = callbackData.transaction_id || callbackData.transactionId || callbackData.id || "";
    const amount = callbackData.amount || "";
    const hash = callbackData.hash || callbackData.signature || "";

    if (!invoiceId) {
      console.error("WCT Callback: No invoice_id found in payload");
      return new Response(JSON.stringify({ error: "Missing invoice_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify hash if provided
    if (hash && WCT_API_SECRET) {
      const expectedHash = await md5(`${WCT_API_SECRET}${invoiceId}${amount}${status}`);
      if (hash !== expectedHash) {
        console.error("WCT Callback: Hash mismatch", { expected: expectedHash, received: hash });
      }
    }

    // Find the payment order
    const { data: order, error: findError } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("order_reference", invoiceId)
      .single();

    if (findError || !order) {
      console.error("WCT Callback: Order not found for invoice_id:", invoiceId, findError);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if already approved (prevent duplicate provisioning)
    if (order.status === "approved") {
      console.log(`WCT Callback: Order ${invoiceId} already approved, skipping`);
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine new status
    const normalizedStatus = status.toLowerCase();
    let newOrderStatus = "pending";

    if (["success", "completed", "paid", "approved", "1"].includes(normalizedStatus)) {
      newOrderStatus = "approved";
    } else if (["failed", "declined", "rejected", "error", "0"].includes(normalizedStatus)) {
      newOrderStatus = "failed";
    } else if (["pending", "processing", "waiting"].includes(normalizedStatus)) {
      newOrderStatus = "pending";
    }

    // Handle successful payment: auto-provision account
    let accountNumber = "";
    if (newOrderStatus === "approved") {
      try {
        const result = await provisionAccount(supabase, order);
        accountNumber = result.accountNumber;
      } catch (provisionError) {
        console.error("WCT Callback: Auto-provisioning failed:", provisionError);
        // Still mark as paid but flag the provisioning failure
        newOrderStatus = "paid";
      }
    }

    // Update the payment order
    const { error: updateError } = await supabase
      .from("payment_orders")
      .update({
        status: newOrderStatus,
        wct_payment_id: transactionId || null,
        admin_notes: newOrderStatus === "approved"
          ? `Auto-approved & provisioned. Account: ${accountNumber}. WCT txn: ${transactionId}`
          : newOrderStatus === "paid"
          ? `Payment confirmed but auto-provisioning failed. WCT txn: ${transactionId}. Manual provisioning required.`
          : `WCT callback: status=${status}, txn=${transactionId}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("WCT Callback: Failed to update order:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`WCT Callback: Order ${invoiceId} updated to status: ${newOrderStatus}`);

    // Send email notifications (non-blocking)
    const userEmail = order.email;
    if (userEmail) {
      try {
        if (newOrderStatus === "approved") {
          await sendEmail(
            userEmail,
            "✅ Payment Confirmed – Your Trading Account is Ready!",
            buildSuccessEmail(order, accountNumber)
          );
        } else if (newOrderStatus === "failed") {
          await sendEmail(
            userEmail,
            "Payment Unsuccessful – Kubera Markets",
            buildFailedEmail(order)
          );
        }
      } catch (emailError) {
        console.error("WCT Callback: Email sending failed:", emailError);
        // Don't fail the callback for email errors
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WCT Callback error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
