import { supabase } from "@/integrations/supabase/client";

// Parse user agent to get browser and OS info
function parseUserAgent(ua: string) {
  let browser = "Unknown";
  let os = "Unknown";
  let deviceType = "Desktop";

  // Detect browser
  if (ua.includes("Firefox")) {
    browser = "Firefox";
  } else if (ua.includes("Edg")) {
    browser = "Edge";
  } else if (ua.includes("Chrome")) {
    browser = "Chrome";
  } else if (ua.includes("Safari")) {
    browser = "Safari";
  } else if (ua.includes("Opera") || ua.includes("OPR")) {
    browser = "Opera";
  }

  // Detect OS
  if (ua.includes("Windows")) {
    os = "Windows";
  } else if (ua.includes("Mac OS")) {
    os = "macOS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  } else if (ua.includes("Android")) {
    os = "Android";
    deviceType = "Mobile";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
    deviceType = "Mobile";
  }

  return { browser, os, deviceType };
}

// Fetch IP address from a free service
async function getClientIP(): Promise<string | null> {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json();
      return data.ip || null;
    }
  } catch {
    // Silently fail - IP logging is best effort
  }
  return null;
}

export async function recordLoginHistory(userId: string) {
  try {
    const ua = navigator.userAgent;
    const { browser, os, deviceType } = parseUserAgent(ua);
    const ip = await getClientIP();

    await supabase.from("login_history").insert({
      user_id: userId,
      ip_address: ip,
      user_agent: ua,
      browser,
      os,
      device_type: deviceType,
      status: "success",
    });
  } catch (error) {
    // Don't fail the login if history recording fails
    console.error("Failed to record login history:", error);
  }
}
