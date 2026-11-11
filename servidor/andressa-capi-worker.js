/**
 * Worker: andressa-p-lp (Cloudflare)
 * Recebe o clique final do quiz da LP da Andressa Pratez Fotografia
 * e envia o evento Lead ao Meta Conversions API (CAPI).
 *
 * Deploy: Cloudflare > Workers > andressa-p-lp > Edit code > cole este código > Deploy.
 * Variável secreta (já existente): META_ACCESS_TOKEN
 *
 * user_data: IP, navegador, fbp e fbc sempre; e, quando a pessoa aceitou os
 * cookies, os dados do contato já com hash SHA-256 feito no navegador
 * (ph, fn, country, external_id). Só passam valores de hash (64 hex), nunca
 * texto aberto.
 */

const PIXEL_ID = "2163257197549501";
const CHAVES_HASH = ["ph", "fn", "ln", "em", "country", "external_id"];
const HASH = /^[a-f0-9]{64}$/;

function dadosHash(entrada) {
  const saida = {};
  if (!entrada || typeof entrada !== "object") return saida;
  for (const chave of CHAVES_HASH) {
    const valor = entrada[chave];
    const lista = (Array.isArray(valor) ? valor : [valor]).filter(
      (v) => typeof v === "string" && HASH.test(v)
    );
    if (lista.length) saida[chave] = lista.slice(0, 3);
  }
  return saida;
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json();
      const { event_id, event_source_url, fbp, fbc, content_name, user_data } = body;

      const eventPayload = {
        data: [
          {
            event_name: "Lead",
            event_time: Math.floor(Date.now() / 1000),
            event_id: event_id || crypto.randomUUID(),
            event_source_url: event_source_url || "",
            action_source: "website",
            user_data: {
              ...dadosHash(user_data),
              client_ip_address: request.headers.get("CF-Connecting-IP") || "",
              client_user_agent: request.headers.get("User-Agent") || "",
              ...(fbp ? { fbp } : {}),
              ...(fbc ? { fbc } : {}),
            },
            custom_data: {
              content_name: content_name || "LP Andressa Pratez Fotografia",
            },
          },
        ],
      };

      const metaRes = await fetch(
        `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${env.META_ACCESS_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventPayload),
        }
      );

      const metaData = await metaRes.json();

      return new Response(JSON.stringify({ ok: true, meta: metaData }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  },
};
