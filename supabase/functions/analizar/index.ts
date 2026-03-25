import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { datos_consulta, idioma, tipo_documento } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "API key no configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const p = datos_consulta?.paciente || {};
    const cal = datos_consulta?.calculos || {};
    const con = datos_consulta?.conclusion || {};
    const med = datos_consulta?.medicaciones || [];
    const especie = p.especie || 'Canino';
    const langs: Record<string,string> = { es:"Responde en español.", en:"Respond in English.", de:"Antworte auf Deutsch.", cat:"Respon en català.", fr:"Réponds en français." };
    const langInstr = langs[idioma] || langs["es"];
    const system = `Eres un asistente veterinario especializado en cardiología de pequeños animales (perros y gatos). Apoyas al veterinario con análisis clínicos. IMPORTANTE: tus respuestas son APOYO ORIENTATIVO, nunca diagnóstico definitivo. ${langInstr}`;
    let userMsg = "";
    if (tipo_documento === "propietario") {
      userMsg = `Redacta una explicación del diagnóstico en lenguaje claro para el propietario y recomendaciones prácticas en casa.\nPaciente: ${p.nombre}, ${especie}, ${p.raza}, ${p.edad} años, ${p.peso}kg\nDiagnóstico del veterinario: ${con.impresion || 'No especificado'}\nTratamiento: ${con.tratamiento || 'No especificado'}\nLA/Ao: ${cal.la_ao || '-'}, FS%: ${cal.fs || '-'}\nRedacta: 1) Explicación simple del diagnóstico (3-4 frases) 2) Recomendaciones en casa 3) Signos de alarma`;
    } else if (tipo_documento === "medicacion") {
      userMsg = `Redacta instrucciones prácticas de medicación para el propietario.\nPaciente: ${p.nombre}, ${especie}, ${p.peso}kg\nMedicaciones: ${med.map((m: any) => `${m.medicamento} ${m.dosis}${m.unidad} ${m.frecuencia} vía ${m.via_administracion}`).join(', ') || 'No especificadas'}\nRedacta: 1) Cómo administrar cada medicamento 2) Qué hacer si olvida una dosis 3) Efectos a vigilar 4) Cuándo consultar urgentemente`;
    } else {
      userMsg = `Analiza este caso de ${especie} y proporciona apoyo orientativo al veterinario.\nPaciente: ${p.nombre}, ${p.raza}, ${p.edad}a, ${p.peso}kg\nÍndices: LA/Ao=${cal.la_ao}, FS%=${cal.fs}, E/A=${cal.e_a}, E/e'=${cal.e_eprime}, Tei=${cal.tei}, PAPs=${cal.paps}mmHg\nImpresión del veterinario: ${con.impresion || 'No especificada'}\nProporciona: 1) Valoración de coherencia de datos 2) Consideraciones clínicas relevantes 3) Puntos de seguimiento`;
    }
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages: [{ role: "user", content: userMsg }] }),
    });
    if (!resp.ok) throw new Error("Anthropic error");
    const data = await resp.json();
    return new Response(JSON.stringify({ resultado: data.content?.[0]?.text || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
