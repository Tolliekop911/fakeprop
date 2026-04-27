import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map our symbols to Twelve Data format
const symbolMap: Record<string, string> = {
  "EUR-USD": "EUR/USD",
  "GBP-USD": "GBP/USD",
  "USD-JPY": "USD/JPY",
  "USD-CHF": "USD/CHF",
  "AUD-USD": "AUD/USD",
  "USD-CAD": "USD/CAD",
  "NZD-USD": "NZD/USD",
  "EUR-GBP": "EUR/GBP",
  "XAUUSD": "XAU/USD",
  "XAGUSD": "XAG/USD",
  "USOIL": "WTI/USD",
  "BTC-USD": "BTC/USD",
  "ETH-USD": "ETH/USD",
  "XRP-USD": "XRP/USD",
  "SOL-USD": "SOL/USD",
};

// Spread values (in price units)
const spreads: Record<string, number> = {
  "EUR-USD": 0.0002,
  "GBP-USD": 0.0003,
  "USD-JPY": 0.03,
  "USD-CHF": 0.0003,
  "AUD-USD": 0.0003,
  "USD-CAD": 0.0003,
  "NZD-USD": 0.0003,
  "EUR-GBP": 0.0003,
  "XAUUSD": 0.5,
  "XAGUSD": 0.03,
  "USOIL": 0.04,
  "BTC-USD": 30.0,
  "ETH-USD": 2.5,
  "XRP-USD": 0.003,
  "SOL-USD": 0.3,
};

type Cached = {
  data: {
    symbol: string;
    bid: number;
    ask: number;
    price: number;
    spread: number;
    change: number;
    timestamp: string;
  };
  fetchedAt: number;
};

// In-memory cache (per function instance). Keeps us under provider rate limits.
const cache = new Map<string, Cached>();
const CACHE_TTL_MS = 55_000;

function fmt(price: number) {
  return parseFloat(price.toFixed(price > 100 ? 2 : 5));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol } = await req.json();
    const apiKey = Deno.env.get("TWELVE_DATA_API_KEY");

    if (!apiKey) throw new Error("TWELVE_DATA_API_KEY not configured");
    if (!symbol || typeof symbol !== "string") throw new Error("symbol is required");

    const twelveDataSymbol = symbolMap[symbol];
    if (!twelveDataSymbol) throw new Error(`Unknown symbol: ${symbol}`);

    const cached = cache.get(symbol);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return new Response(JSON.stringify({ ...cached.data, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use a SINGLE endpoint to reduce credits (quote includes percent_change).
    const quoteResponse = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(twelveDataSymbol)}&apikey=${apiKey}`
    );

    const quoteData = await quoteResponse.json();

    if (quoteData?.status === "error") {
      const message = quoteData.message || "Failed to fetch quote";

      // If rate-limited, serve cached data (if any) instead of failing hard.
      const isRateLimit = /run out of API credits|limit/i.test(message);
      if (isRateLimit && cached) {
        return new Response(JSON.stringify({ ...cached.data, cached: true, stale: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: message }), {
        status: isRateLimit ? 429 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawPrice = parseFloat(quoteData.close ?? quoteData.price ?? quoteData.last ?? "NaN");
    if (!Number.isFinite(rawPrice)) {
      throw new Error("Price unavailable from provider");
    }

    const spread = spreads[symbol] || 0.0002;
    const bid = rawPrice - spread / 2;
    const ask = rawPrice + spread / 2;

    const change = quoteData.percent_change ? parseFloat(quoteData.percent_change) : 0;

    const payload = {
      symbol,
      bid: fmt(bid),
      ask: fmt(ask),
      price: fmt(rawPrice),
      spread,
      change: parseFloat(change.toFixed(2)),
      timestamp: new Date().toISOString(),
    };

    cache.set(symbol, { data: payload, fetchedAt: Date.now() });

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error fetching market price:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

