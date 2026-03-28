import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(phone: string): string {
  // Remove whatsapp: prefix, spaces, dashes, parens
  let clean = phone.replace(/^whatsapp:/, "").replace(/[\s\-\(\)]/g, "");
  // Ensure starts with +
  if (!clean.startsWith("+")) {
    if (clean.startsWith("55")) clean = "+" + clean;
    else clean = "+55" + clean;
  }
  return clean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = claimsData.claims.sub as string;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "superadmin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { startDate, endDate, breakdown } = await req.json();
    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: "startDate and endDate required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const credentials = btoa(`${accountSid}:${authToken}`);

    // BREAKDOWN MODE: fetch individual messages and group by condominium
    if (breakdown) {
      console.log("Breakdown mode: fetching individual messages");

      // Get all residents with service role for cross-condominium access
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: residents } = await supabaseAdmin
        .from("residents")
        .select("phone, condominium_id")
        .is("deleted_at", null);

      // Build phone → condominium_id map
      const phoneToCondMap = new Map<string, string>();
      if (residents) {
        for (const r of residents) {
          if (r.phone && r.condominium_id) {
            phoneToCondMap.set(normalizePhone(r.phone), r.condominium_id);
          }
        }
      }
      console.log(`Phone map: ${phoneToCondMap.size} entries`);

      const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_FROM") || "whatsapp:+5511979684575";
      const perCondominium: Record<string, { count: number; price: number }> = {};
      const unmatched = { count: 0, price: 0 };
      let totalMessages = 0;
      let totalPrice = 0;

      let nextPageUri: string | null = null;
      const baseUrl = new URL(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
      );
      baseUrl.searchParams.set("DateSent>", startDate);
      baseUrl.searchParams.set("DateSent<", endDate);
      baseUrl.searchParams.set("From", twilioFrom);
      baseUrl.searchParams.set("PageSize", "1000");

      let pageNum = 0;
      do {
        const fetchUrl = nextPageUri
          ? `https://api.twilio.com${nextPageUri}`
          : baseUrl.toString();

        console.log(`Messages page ${pageNum}: ${fetchUrl.substring(0, 120)}...`);

        const res = await fetch(fetchUrl, {
          headers: { Authorization: `Basic ${credentials}` },
        });

        if (!res.ok) {
          const errorBody = await res.text();
          console.error("Twilio Messages API error:", res.status, errorBody);
          throw new Error(`Twilio Messages API returned ${res.status}`);
        }

        const data = await res.json();
        const messages = data.messages || [];
        console.log(`Page ${pageNum}: ${messages.length} messages`);

        for (const msg of messages) {
          const price = Math.abs(parseFloat(msg.price || "0"));
          const toPhone = normalizePhone(msg.to || "");
          const condId = phoneToCondMap.get(toPhone);

          totalMessages++;
          totalPrice += price;

          if (condId) {
            if (!perCondominium[condId]) {
              perCondominium[condId] = { count: 0, price: 0 };
            }
            perCondominium[condId].count++;
            perCondominium[condId].price += price;
          } else {
            unmatched.count++;
            unmatched.price += price;
          }
        }

        nextPageUri = data.next_page_uri || null;
        pageNum++;
      } while (nextPageUri && pageNum < 20);

      console.log(`Breakdown total: ${totalMessages} msgs, $${totalPrice.toFixed(4)}, ${Object.keys(perCondominium).length} condominiums, ${unmatched.count} unmatched`);

      return new Response(
        JSON.stringify({
          perCondominium,
          unmatched,
          totalMessages,
          totalPrice,
          startDate,
          endDate,
          source: "twilio_messages_api",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DEFAULT MODE: aggregate usage records
    const aggregateCategories = new Set([
      "totalprice",
      "channels",
      "channels-messaging",
      "channels-whatsapp",
      "phonenumbers",
    ]);

    const results: Record<string, { count: number; price: number; price_unit: string }> = {};
    let totalPrice = 0;
    let totalCount = 0;

    let nextPageUri: string | null = null;
    let pageUrl = new URL(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Usage/Records.json`
    );
    pageUrl.searchParams.set("StartDate", startDate);
    pageUrl.searchParams.set("EndDate", endDate);
    pageUrl.searchParams.set("PageSize", "1000");

    let pageNum = 0;
    do {
      const fetchUrl = nextPageUri
        ? `https://api.twilio.com${nextPageUri}`
        : pageUrl.toString();

      console.log(`Fetching page ${pageNum}:`, fetchUrl);

      const res = await fetch(fetchUrl, {
        headers: { Authorization: `Basic ${credentials}` },
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error("Twilio API error:", res.status, errorBody);
        throw new Error(`Twilio API returned ${res.status}`);
      }

      const data = await res.json();
      console.log(`Page ${pageNum}: ${data.usage_records?.length || 0} records, next_page_uri: ${data.next_page_uri}`);

      if (data.usage_records?.length > 0) {
        for (const rec of data.usage_records) {
          const price = parseFloat(rec.price || "0");
          const count = parseInt(rec.count || "0", 10);
          if ((price > 0 || count > 0) && !aggregateCategories.has(rec.category)) {
            console.log(`Category: ${rec.category}, count: ${count}, price: ${price}`);
            results[rec.category] = {
              count,
              price,
              price_unit: rec.price_unit || "USD",
            };
            totalPrice += price;
            totalCount += count;
          }
        }
      }

      nextPageUri = data.next_page_uri || null;
      pageNum++;
    } while (nextPageUri && pageNum < 10);

    console.log(`Total: ${Object.keys(results).length} categories with usage, price: ${totalPrice}, count: ${totalCount}`);

    return new Response(
      JSON.stringify({
        categories: results,
        totalPrice,
        totalCount,
        startDate,
        endDate,
        source: "twilio_api",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("twilio-usage error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
