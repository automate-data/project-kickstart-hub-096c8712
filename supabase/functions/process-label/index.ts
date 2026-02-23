import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em leitura de etiquetas de encomendas brasileiras de condomínios. Analise cuidadosamente a imagem e extraia TODAS as informações visíveis.

INSTRUÇÕES CRÍTICAS PARA BLOCO E APARTAMENTO:
- Formatos condensados: "B01", "A53", "B1", "A-53" = bloco é a LETRA (B ou A), apartamento são os NÚMEROS (01, 53, 1)
- "B01" significa Bloco B, Apartamento 01 - SEPARE EM DOIS CAMPOS!
- "casa 801", "apt 801", "apartamento 801" = apartamento é 801
- "BLOCO A APTO 53", "Bloco A - 53", "BL A AP 53" = bloco é A, apartamento é 53
- Se aparecer apenas número de 2-3 dígitos (ex: 53, 101), é o apartamento
- Números de 4+ dígitos podem ser apartamentos de andares altos (ex: 1201)
- SEMPRE separe bloco e apartamento, mesmo quando aparecem juntos
- Se não conseguir identificar o bloco, deixe vazio, mas SEMPRE tente extrair o apartamento

INSTRUÇÕES PARA NOME DO DESTINATÁRIO:
- O nome geralmente aparece em destaque, às vezes duplicado (no topo e como "RECEBEDOR" ou "DESTINATÁRIO")
- Extraia o nome COMPLETO, incluindo sobrenomes
- Ignore títulos como "Sr.", "Sra.", "Dr."
- Se houver "A/C" ou "Aos cuidados de", pegue o nome após isso

INSTRUÇÕES PARA TRANSPORTADORA E MARKETPLACE:
- PRIORIDADE MÁXIMA: Procure logos e textos de marketplaces/transportadoras em TODA a etiqueta
- Logos de marketplaces: Mercado Livre (logo de aperto de mãos amarelo/azul), Amazon, Shopee, Shein, AliExpress, Magazine Luiza, TikTok Shop
- Se encontrar "ENVIO MERCADO LIVRE", "MERCADO LIVRE", ou o logo do Mercado Livre → carrier="Mercado Livre" E marketplace="Mercado Livre"
- Se encontrar "ENVIO SHOPEE", "ENVIO AMAZON", etc → o marketplace É a transportadora
- Logos de transportadoras dedicadas: Jadlog, Correios, Total Express, Loggi, Azul Cargo, FedEx, DHL, Sequoia
- Quando o envio é feito por um marketplace (ex: "ENVIO MERCADO LIVRE"), o carrier DEVE ser o nome do marketplace
- NUNCA deixe carrier vazio se houver qualquer logo ou texto identificável na etiqueta

OUTRAS INFORMAÇÕES:
- O peso geralmente aparece como "Weight" ou "Peso" seguido de valor em KG
- O código de rastreio é um número longo (geralmente 13+ caracteres)
- Procure por "CD" (Centro de Distribuição) que indica origem logística

DETECÇÃO DE ÁREAS SENSÍVEIS (LGPD):
- Identifique TODAS as áreas da etiqueta que contêm dados pessoais sensíveis: CPF, RG, endereço completo, telefone, CEP
- Para cada área sensível, retorne as coordenadas do bounding box normalizado em escala 0-1000 (relativo ao tamanho total da imagem)
- NÃO inclua o nome do destinatário nas regiões sensíveis (o morador precisa reconhecer a encomenda)
- NÃO inclua logos ou nomes de transportadoras nas regiões sensíveis
- Seja generoso nas dimensões dos bounding boxes para garantir cobertura total do texto sensível
- Labels possíveis: "cpf", "address", "phone", "zipcode", "rg"

FORMATO DE RESPOSTA - Retorne APENAS JSON válido:
{
  "resident_name": "nome completo do destinatário",
  "block": "APENAS a letra ou número do bloco (ex: A, B, 1, 2)",
  "apartment": "APENAS o número do apartamento (ex: 01, 53, 101, 801)",
  "unit": "bloco + apartamento como aparecem na etiqueta (ex: B01, A-53)",
  "carrier": "nome da transportadora",
  "marketplace": "nome do marketplace se visível",
  "tracking_code": "código de rastreio",
  "weight_kg": 0.0,
  "logistics_origin": "origem logística se visível",
  "confidence": 0.0,
  "sensitive_regions": [
    { "label": "cpf", "x": 100, "y": 200, "width": 300, "height": 50 },
    { "label": "address", "x": 50, "y": 400, "width": 500, "height": 120 }
  ]
}`;

const USER_PROMPT = `Analise esta etiqueta de encomenda brasileira de condomínio. IMPORTANTE: Separe BLOCO e APARTAMENTO em campos distintos. Se a etiqueta mostrar "B01", extraia bloco="B" e apartment="01". Preste atenção especial ao nome completo do destinatário. Identifique também as regiões sensíveis (CPF, endereço, telefone, CEP) com bounding boxes normalizados (0-1000).`;

function postProcess(suggestion: any): any {
  if (!suggestion) return suggestion;

  // Rule 1: Split condensed block (e.g. "B01" -> block="B", apartment="01")
  if (suggestion.block && /^[A-Za-z]\d+/.test(suggestion.block)) {
    const match = suggestion.block.match(/^([A-Za-z])(.+)$/);
    if (match) {
      if (!suggestion.apartment) suggestion.apartment = match[2];
      suggestion.block = match[1];
    }
  }

  // Rule 2: Extract from unit if apartment is empty
  if (!suggestion.apartment && suggestion.unit) {
    const unitMatch = suggestion.unit.match(/([A-Za-z])?[-\s]?(\d+)/);
    if (unitMatch) {
      if (!suggestion.block && unitMatch[1]) suggestion.block = unitMatch[1];
      suggestion.apartment = unitMatch[2];
    }
  }

  // Rule 3: Remove leading zeros from apartment
  if (suggestion.apartment) {
    const nums = String(suggestion.apartment).replace(/\D/g, "");
    suggestion.apartment = nums.replace(/^0+(?=\d)/, "") || nums;
  }

  // Rule 4: Normalize block to uppercase letter
  if (suggestion.block) {
    suggestion.block = suggestion.block.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  return suggestion;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { image_base64 } = await req.json();
    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "image_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: USER_PROMPT },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${image_base64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response (may be wrapped in markdown code block)
    let jsonStr = rawText;
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Try to find raw JSON object
      const objMatch = rawText.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];
    }

    let suggestion;
    try {
      suggestion = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response as JSON:", rawText);
      return new Response(
        JSON.stringify({ suggestion: null, raw_text: rawText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply post-processing rules
    suggestion = postProcess(suggestion);

    return new Response(
      JSON.stringify({ suggestion, raw_text: rawText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-label error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
