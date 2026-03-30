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

    const { phone, residentName, registeredBy, photoFilename } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone to E.164
    console.log("Original phone:", phone);
    let cleanPhone = phone.replace(/whatsapp:/gi, "").replace(/[^\d]/g, "");
    if (cleanPhone.startsWith("55") && cleanPhone.length >= 12) {
      cleanPhone = `+${cleanPhone}`;
    } else if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = `+55${cleanPhone}`;
    } else if (!cleanPhone.startsWith("+")) {
      cleanPhone = `+${cleanPhone}`;
    }
    console.log("Normalized phone:", cleanPhone);
    const toNumber = `whatsapp:${cleanPhone}`;
    const fromNumber = TWILIO_WHATSAPP_FROM.startsWith("whatsapp:")
      ? TWILIO_WHATSAPP_FROM
      : `whatsapp:${TWILIO_WHATSAPP_FROM}`;

    // Format current date/time in Brazilian format
    const now = new Date();
    const dateTimeBR = now.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const photoValue = photoFilename
      ? (String(photoFilename).split("/").pop() || "").trim()
      : "";

    const contentVariables = JSON.stringify({
      "1": residentName || "Morador",
      "2": registeredBy || "Portaria",
      "3": dateTimeBR,
      "4": photoValue,
    });

    console.log("ContentVariables:", contentVariables);

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const body = new URLSearchParams({
      To: toNumber,
      From: fromNumber,
      ContentSid: "HX48448c038f3a44d929c03391ef998b9d",
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
        JSON.stringify({ error: `Twilio error [${response.status}]: ${data.message || JSON.stringify(data)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("WhatsApp sent successfully, SID:", data.sid);

    return new Response(
      JSON.stringify({ success: true, sid: data.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-whatsapp error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
