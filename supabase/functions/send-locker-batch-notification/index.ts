import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      throw new Error("Twilio credentials not configured");
    }

    const {
      resident_phone,
      resident_name,
      package_count,
      locker_reference,
      tower_name,
    } = await req.json();

    if (!resident_phone) {
      return new Response(
        JSON.stringify({ success: false, error: "resident_phone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone to E.164
    let cleanPhone = String(resident_phone).replace(/whatsapp:/gi, "").replace(/[^\d]/g, "");
    if (cleanPhone.startsWith("55") && cleanPhone.length >= 12) {
      cleanPhone = `+${cleanPhone}`;
    } else if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = `+55${cleanPhone}`;
    } else if (!cleanPhone.startsWith("+")) {
      cleanPhone = `+${cleanPhone}`;
    }

    const toNumber = `whatsapp:${cleanPhone}`;
    const fromNumber = TWILIO_WHATSAPP_FROM.startsWith("whatsapp:")
      ? TWILIO_WHATSAPP_FROM
      : `whatsapp:${TWILIO_WHATSAPP_FROM}`;

    const contentVariables = JSON.stringify({
      "1": resident_name || "Morador",
      "2": String(package_count ?? ""),
      "3": locker_reference || "",
      "4": tower_name || "",
    });

    console.log("Batch locker ContentVariables:", contentVariables);

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const body = new URLSearchParams({
      To: toNumber,
      From: fromNumber,
      ContentSid: "HXf06ac69beecaa15d02e6543c77a4c954",
      ContentVariables: contentVariables,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio error:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: `Twilio error [${response.status}]: ${data.message || JSON.stringify(data)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Batch locker notification sent, SID:", data.sid);

    return new Response(
      JSON.stringify({ success: true, sid: data.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-locker-batch-notification error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
