import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTERNAL_API_URL = "https://backapi.kuberaglobalmarkets.com/api/v1/createChallengeAccount";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : {});

const toStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result.length > 0 ? result : null;
};

const getCandidates = (payload: JsonRecord): JsonRecord[] => {
  const candidates: JsonRecord[] = [payload];
  const data = asRecord(payload.data);
  const result = asRecord(payload.result);

  if (Object.keys(data).length > 0) candidates.push(data);
  if (Object.keys(result).length > 0) candidates.push(result);

  return candidates;
};

const pickValue = (candidates: JsonRecord[], keys: string[]): unknown => {
  for (const candidate of candidates) {
    for (const key of keys) {
      if (candidate[key] !== undefined && candidate[key] !== null) {
        return candidate[key];
      }
    }

    const lowerKeyMap = new Map<string, unknown>(
      Object.entries(candidate).map(([key, value]) => [key.toLowerCase(), value]),
    );

    for (const key of keys) {
      const value = lowerKeyMap.get(key.toLowerCase());
      if (value !== undefined && value !== null) {
        return value;
      }
    }
  }

  return undefined;
};

const toBooleanOrNull = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "success", "ok", "approved"].includes(normalized)) return true;
    if (["false", "0", "error", "failed", "failure"].includes(normalized)) return false;
  }

  return null;
};

async function sendWelcomeEmail(
  sendgridKey: string,
  toEmail: string,
  userName: string,
  accountLogin: string,
  accountPassword: string,
  challengeDetails: { phase: string; program_type: string; account_size: number; profit_target_percent: number; max_drawdown_percent: number; daily_drawdown_percent: number; min_trading_days: number }
) {
  const formatMoney = (n: number) => `$${n.toLocaleString()}`;
  const phaseLabel = challengeDetails.phase === "phase1" ? "Phase 1 (Evaluation)"
    : challengeDetails.phase === "phase2" ? "Phase 2 (Verification)"
    : challengeDetails.phase === "funded" ? "Funded Account"
    : challengeDetails.phase;
  const programLabel = challengeDetails.program_type === "1-step" ? "1-Step" : challengeDetails.program_type === "2-step" ? "2-Step" : challengeDetails.program_type;

  const plainText = `Welcome to Kubera Global Markets

Dear ${userName},

Your account has been successfully created. Below are your login credentials and account details.

Account Credentials
Login: ${accountLogin}
Password: ${accountPassword}

Account Details
Program: ${programLabel}
Current Level: ${phaseLabel}
Account Size: ${formatMoney(challengeDetails.account_size)}
Target: ${challengeDetails.profit_target_percent}%
Max Drawdown: ${challengeDetails.max_drawdown_percent}%
Daily Drawdown: ${challengeDetails.daily_drawdown_percent}%
Min Days: ${challengeDetails.min_trading_days}
Platform Download: https://www.kuberaglobalmarkets.com/faq/downloads

Please keep your credentials safe.

Best regards,
Kubera Global Markets
support@kuberamarkets.com`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
  <tr><td style="background-color:#111111;padding:24px;text-align:center;">
    <h1 style="color:#d4af37;margin:0;font-size:22px;">Kubera Global Markets</h1>
  </td></tr>
  <tr><td style="padding:24px 32px;">
    <p style="color:#333333;font-size:15px;line-height:1.6;margin:0 0 16px;">Dear ${userName},</p>
    <p style="color:#333333;font-size:15px;line-height:1.6;margin:0 0 20px;">Your account has been successfully created. Below are your login credentials and account details.</p>
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;border:1px solid #e0e0e0;border-radius:6px;margin:0 0 20px;">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e0e0e0;">
        <strong style="color:#333333;font-size:14px;">Account Credentials</strong>
      </td></tr>
      <tr><td style="padding:12px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="color:#666666;font-size:14px;padding:4px 0;width:40%;">Login:</td><td style="color:#333333;font-size:14px;padding:4px 0;font-weight:bold;">${accountLogin}</td></tr>
          <tr><td style="color:#666666;font-size:14px;padding:4px 0;">Password:</td><td style="color:#333333;font-size:14px;padding:4px 0;font-weight:bold;">${accountPassword}</td></tr>
        </table>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;border:1px solid #e0e0e0;border-radius:6px;margin:0 0 20px;">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e0e0e0;">
        <strong style="color:#333333;font-size:14px;">Account Details</strong>
      </td></tr>
      <tr><td style="padding:12px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="color:#666666;font-size:14px;padding:4px 0;width:40%;">Program:</td><td style="color:#333333;font-size:14px;padding:4px 0;">${programLabel}</td></tr>
          <tr><td style="color:#666666;font-size:14px;padding:4px 0;">Level:</td><td style="color:#333333;font-size:14px;padding:4px 0;">${phaseLabel}</td></tr>
          <tr><td style="color:#666666;font-size:14px;padding:4px 0;">Account Size:</td><td style="color:#333333;font-size:14px;padding:4px 0;">${formatMoney(challengeDetails.account_size)}</td></tr>
          <tr><td style="color:#666666;font-size:14px;padding:4px 0;">Target:</td><td style="color:#333333;font-size:14px;padding:4px 0;">${challengeDetails.profit_target_percent}%</td></tr>
          <tr><td style="color:#666666;font-size:14px;padding:4px 0;">Max Drawdown:</td><td style="color:#333333;font-size:14px;padding:4px 0;">${challengeDetails.max_drawdown_percent}%</td></tr>
          <tr><td style="color:#666666;font-size:14px;padding:4px 0;">Daily Drawdown:</td><td style="color:#333333;font-size:14px;padding:4px 0;">${challengeDetails.daily_drawdown_percent}%</td></tr>
          <tr><td style="color:#666666;font-size:14px;padding:4px 0;">Min Days:</td><td style="color:#333333;font-size:14px;padding:4px 0;">${challengeDetails.min_trading_days}</td></tr>
          <tr><td style="color:#666666;font-size:14px;padding:4px 0;">Platform:</td><td style="font-size:14px;padding:4px 0;"><a href="https://www.kuberaglobalmarkets.com/faq/downloads" style="color:#d4af37;text-decoration:underline;font-weight:bold;">Download Here</a></td></tr>
        </table>
      </td></tr>
    </table>

    <p style="color:#666666;font-size:13px;line-height:1.5;margin:0 0 8px;">Please keep your credentials safe.</p>
    <p style="color:#666666;font-size:13px;line-height:1.5;margin:0;">Best regards,<br><strong style="color:#333333;">Kubera Global Markets</strong></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${sendgridKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: "support@kuberamarkets.com", name: "Kubera Global Markets" },
      subject: "Your Kubera Global Markets Account is Ready",
      content: [
        { type: "text/plain", value: plainText },
        { type: "text/html", value: html },
      ],
    }),
  });

  const sendgridResponseText = await res.text();

  if (!res.ok) {
    console.error("SendGrid error:", res.status, sendgridResponseText);
  } else {
    console.log("Welcome email sent to", toEmail);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // ✅ SERVICE ROLE BYPASS — allows Supabase dashboard testing and server-side calls
    const isServiceRole = token === supabaseServiceKey;

    if (!isServiceRole) {
      // Validate as a regular user JWT and check admin role
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: userData, error: userError } = await authClient.auth.getUser(token);
      if (userError || !userData?.user) {
        console.error("Auth error:", userError);
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const callerUserId = userData.user.id;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callerUserId)
        .in("role", ["admin", "root", "moderator"])
        .limit(1)
        .maybeSingle();

      if (!roleData) {
        console.error(`Access denied for user ${callerUserId} - no admin/root/moderator role found`);
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Authorized: user ${callerUserId} has role ${roleData.role}`);
    } else {
      console.log("Authorized: service role key used");
    }

    const { userId, profileId, challengeId } = await req.json();

    if (!userId || !profileId || !challengeId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, profileId, challengeId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Calling createChallengeAccount: userId=${userId}, profileId=${profileId}, challengeId=${challengeId}`);

    // Call Condor external API
    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        profile_id: profileId,
        paymentOrderID: challengeId,
      }),
    });

    const responseText = await externalResponse.text();
    let parsedResponse: unknown = null;

    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      parsedResponse = { raw: responseText };
    }

    const responseData = asRecord(parsedResponse);
    const responseKeys = Object.keys(responseData);

    console.log(`External API response [${externalResponse.status}]:`, JSON.stringify(responseData));
    console.log(`Response keys: ${responseKeys.length > 0 ? responseKeys.join(", ") : "(none)"}`);

    if (!externalResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "External API call failed",
          status: externalResponse.status,
          details: responseData,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidates = getCandidates(responseData);
    const successFlag = toBooleanOrNull(pickValue(candidates, ["success", "isSuccess"]));
    const statusValue = toStringOrNull(pickValue(candidates, ["status"]));
    const explicitError = toBooleanOrNull(pickValue(candidates, ["error", "hasError"])) === true;

    const isSuccess =
      successFlag ??
      (statusValue ? ["success", "ok", "approved"].includes(statusValue.toLowerCase()) : null) ??
      (externalResponse.ok && !explicitError);

    console.log(
      `Success check: success=${successFlag}, status=${statusValue ?? "null"}, explicitError=${explicitError}, isSuccess=${isSuccess}`,
    );

    if (!isSuccess) {
      return new Response(
        JSON.stringify({
          error: "External API returned an unsuccessful response",
          details: responseData,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const personalAccountId = toStringOrNull(
      pickValue(candidates, ["PersonalAccountID", "personalAccountID", "personal_account_id", "PersonalAccountId"]),
    );
    const externalAccountId = toStringOrNull(
      pickValue(candidates, ["ExternalAccountID", "externalAccountID", "external_account_id", "ExternalAccountId"]),
    );
    const accountLogin =
      toStringOrNull(pickValue(candidates, ["AccountLogin", "accountLogin", "account_login", "login"])) ??
      externalAccountId;
    const accountPassword =
      toStringOrNull(pickValue(candidates, ["pass", "password", "AccountPassword", "accountPassword", "account_password"]));

    console.log(`Parsed IDs - PersonalAccountID: ${personalAccountId}, ExternalAccountID: ${externalAccountId}`);

    if (!personalAccountId && !externalAccountId) {
      console.error("External API success response did not include account IDs", JSON.stringify(responseData));
      return new Response(
        JSON.stringify({
          error: "External API did not return PersonalAccountID or ExternalAccountID",
          details: responseData,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update challenge record
    const { data: updateData, error: updateError } = await supabase
      .from("challenges")
      .update({
        personal_account_id: personalAccountId,
        external_account_id: externalAccountId,
      })
      .eq("id", challengeId)
      .select("id, personal_account_id, external_account_id")
      .single();

    if (updateError || !updateData) {
      console.error(`Failed to update challenge ${challengeId}:`, JSON.stringify(updateError));
      return new Response(
        JSON.stringify({
          error: "Failed to persist external account IDs",
          details: updateError,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Updated challenge ${challengeId} successfully:`, JSON.stringify(updateData));

    // Fetch challenge details for email
    const { data: challengeData } = await supabase
      .from("challenges")
      .select("phase, program_type, account_size, profit_target_percent, max_drawdown_percent, daily_drawdown_percent, min_trading_days")
      .eq("id", challengeId)
      .single();

    // Fetch user profile for email
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email, full_name, first_name")
      .eq("user_id", userId)
      .single();

    console.log(`Email check - email: ${profileData?.email}, login: ${accountLogin}, pass: ${accountPassword ? 'SET' : 'NULL'}, challenge: ${challengeData ? 'SET' : 'NULL'}`);

    if (profileData?.email && accountLogin && accountPassword && challengeData) {
      const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
      if (sendgridKey) {
        try {
          await sendWelcomeEmail(
            sendgridKey,
            profileData.email,
            profileData.full_name || profileData.first_name || "Trader",
            accountLogin,
            accountPassword,
            challengeData
          );
          console.log("Welcome email sent successfully");
        } catch (emailErr) {
          console.error("Welcome email failed:", emailErr);
        }
      } else {
        console.warn("SENDGRID_API_KEY not configured, skipping welcome email");
      }
    } else {
      console.warn(`Skipping email - missing data. email=${profileData?.email}, login=${accountLogin}, pass=${!!accountPassword}, challenge=${!!challengeData}`);
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-challenge-account error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
