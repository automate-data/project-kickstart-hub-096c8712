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

  try {
    const requestUrl = new URL(req.url);
    const rawFile = requestUrl.searchParams.get("file")?.trim();
    const fileName = rawFile?.split("/").pop()?.trim() ?? "";

    if (!fileName) {
      return new Response(JSON.stringify({ error: "Missing file parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^redacted_[A-Za-z0-9._-]+$/.test(fileName)) {
      return new Response(JSON.stringify({ error: "Invalid file parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabaseAdmin.storage
      .from("package-photos")
      .createSignedUrl(fileName, 86400);

    if (error || !data?.signedUrl) {
      console.error("Failed to create signed URL:", error);
      return new Response(JSON.stringify({ error: "Photo not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: data.signedUrl,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("package-photo-redirect error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});