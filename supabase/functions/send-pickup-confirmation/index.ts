import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let resident_name: string | undefined;
  let condominium_id: string | null | undefined;
  let package_id: string | null | undefined;

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      throw new Error("Twilio credentials not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Backend credentials not configured");
    }

    const authHeader = req.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "") ?? "";

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { phone, resident_name: parsedResidentName, picked_up_at, condominium_id: parsedCondominiumId, package_id: parsedPackageId } = await req.json();
    resident_name = parsedResidentName;
    condominium_id = parsedCondominiumId ?? null;
    package_id = parsedPackageId ?? null;

    const {
      data: { user },
    } = accessToken ? await authClient.auth.getUser(accessToken) : { data: { user: null } };

    const logWhatsappEvent = async (eventType: "whatsapp_sent" | "whatsapp_failed", metadata: Record<string, unknown>) => {
      const { error } = await adminClient.from("system_logs").insert({
        event_type: eventType,
        user_id: user?.id ?? null,
        condominium_id,
        package_id,
        metadata,
      });

      if (error) {
        console.error("Failed to insert system log:", JSON.stringify(error));
      }
    };

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const pickupDate = picked_up_at ? new Date(picked_up_at) : new Date();
    const dateTimeBR = pickupDate.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const contentVariables = JSON.stringify({
      "1": resident_name || "Morador",
      "2": dateTimeBR,
    });

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const body = new URLSearchParams({
      To: toNumber,
      From: fromNumber,
      ContentSid: "HXfd32c526e2f3c8209d014dd2c2f27120",
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
      await logWhatsappEvent("whatsapp_failed", {
        context: "pickup_confirmation",
        resident_name: resident_name || null,
        error_message: data.message || JSON.stringify(data),
      });
      return new Response(
        JSON.stringify({ error: `Twilio error [${response.status}]: ${data.message || JSON.stringify(data)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Pickup confirmation sent, SID:", data.sid);
    await logWhatsappEvent("whatsapp_sent", {
      context: "pickup_confirmation",
      resident_name: resident_name || null,
      sid: data.sid,
    });

    return new Response(
      JSON.stringify({ success: true, sid: data.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-pickup-confirmation error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";

    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        await adminClient.from("system_logs").insert({
          event_type: "whatsapp_failed",
          condominium_id: condominium_id ?? null,
          package_id: package_id ?? null,
          metadata: {
            context: "pickup_confirmation",
            resident_name: resident_name || null,
            error_message: msg,
          },
        });
      }
    } catch (logError) {
      console.error("Failed to insert catch system log:", logError);
    }

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});