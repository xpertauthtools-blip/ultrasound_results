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

    const p   = datos_consulta?.paciente || {};
    const cal = datos_consulta?.calculos || {};
    const con = datos_consulta?.conclusion || {};
    const exp = datos_consulta?.exploracion || {};
    const med = datos_consulta?.medicaciones || [];
    const especie = p.especie || 'Canino';

    const langs: Record<string,string> = {
      es: "Responde SIEMPRE en español.",
      en: "ALWAYS respond in English.",
      de: "Antworte IMMER auf Deutsch.",
      cat: "Respon SEMPRE en català.",
      fr: "Réponds TOUJOURS en français.",
    };
    const langInstr = langs[idioma] || langs["es"];

    const system = `Eres un asistente veterinario especializado en cardiología de pequeños animales (perros y gatos).
Tu función es apoyar al veterinario generando texto clínico profesional para informes.
IMPORTANTE: Tus respuestas son APOYO ORIENTATIVO, nunca diagnóstico definitivo.
${langInstr}
CRÍTICO: Todo el texto que generes debe estar en el idioma indicado. Si el veterinario ha escrito en otro idioma, tradúcelo.`;

    let userMsg = "";

    if (tipo_documento === "propietario") {
      userMsg = `Genera el contenido narrativo del informe para el propietario.

PACIENTE: ${p.nombre}, ${especie}, ${p.raza || '—'}, ${p.edad || '—'} años, ${p.peso || '—'} kg
MOTIVO: ${exp.motivo || '—'} | SÍNTOMAS: ${exp.sintomas || '—'}
SOPLO: Grado ${exp.soplo || 0}/VI | FC: ${exp.fc || '—'} lpm | ISACHC: ${exp.isachc || '—'}
ÍNDICES: LA/Ao=${cal.la_ao || '—'} | FS%=${cal.fs || '—'}% | E/A=${cal.e_a || '—'} | E/e'=${cal.e_eprime || '—'} | PAPs=${cal.paps || '—'} mmHg
IMPRESIÓN VETERINARIO: ${con.impresion || '—'}
PLAN: ${con.pruebas || '—'} | TRATAMIENTO: ${con.tratamiento || '—'}
OBSERVACIONES: ${con.observaciones_finales || '—'}

Redacta en el idioma solicitado:
1. Explicación diagnóstica clara para el propietario (sin jerga técnica, 3-4 frases)
2. Recomendaciones prácticas en casa
3. Signos de alarma (cuándo consultar urgentemente)

Traduce cualquier texto del veterinario al idioma solicitado.`;

    } else if (tipo_documento === "medicacion") {
      userMsg = `Genera instrucciones prácticas de medicación para el propietario.

PACIENTE: ${p.nombre}, ${especie}, ${p.peso || '—'} kg
ALERGIAS: ${p.alergias || 'Ninguna conocida'}
MEDICACIONES: ${med.length > 0
  ? med.map((m: any) => `${m.medicamento} ${m.dosis || ''}${m.unidad || ''} cada ${m.frecuencia || '—'} vía ${m.via_administracion || '—'} durante ${m.duracion || '—'}`).join(' | ')
  : 'Sin medicación prescrita'}
OBSERVACIONES: ${con.observaciones_finales || '—'}

Redacta en el idioma solicitado:
1. Cómo administrar cada medicamento
2. Qué hacer si olvida una dosis
3. Efectos secundarios a vigilar
4. Cuándo llamar al veterinario antes de la revisión

Traduce cualquier texto del veterinario al idioma solicitado.`;
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: userMsg }]
      }),
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
