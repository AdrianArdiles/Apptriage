import type { GlasgowDesglose, SignosVitales } from "./types";
import {
  NIVELES_TRIAGE,
  type NivelTriageNombre,
  type RespuestaTriageLLM,
} from "./types";
import { evaluarNivelGravedad, generarRecomendacion } from "./triage-logic";

const NIVEL_GRAVEDAD_A_NOMBRE: Record<1 | 2 | 3 | 4 | 5, NivelTriageNombre> = {
  1: "No urgente",
  2: "Prioritario",
  3: "Urgencia",
  4: "Emergencia",
  5: "Resucitación (Inmediato)",
};

/** Diagnósticos presuntivos por nivel (fallback sin LLM). */
const DIAGNOSTICO_PRESUNTIVO_POR_NIVEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Posible cuadro leve o crónico; sin datos de alarma.",
  2: "Posible deterioro leve o condición que requiere seguimiento.",
  3: "Posible cuadro infeccioso o inflamatorio moderado; valoración recomendada.",
  4: "Posible reacción alérgica aguda, descompensación o cuadro grave; requiere valoración urgente.",
  5: "Posible trauma grave, reanimación o emergencia vital; atención inmediata.",
};

/** Genera explicación técnica y pasos a partir del nivel (fallback sin LLM). */
function fallbackCategorizacion(
  nivelGravedad: 1 | 2 | 3 | 4 | 5,
  recomendacion: string
): {
  explicacion_tecnica: string;
  pasos_a_seguir: string[];
  diagnostico_presuntivo: string;
  justificacion: string;
  recomendacion_inmediata: string;
} {
  const explicaciones: Record<1 | 2 | 3 | 4 | 5, string> = {
    1: "Criterios clínicos y signos vitales dentro de rango. Sin datos de alarma.",
    2: "Situación estable con posible deterioro. Requiere valoración en plazo corto.",
    3: "Datos que sugieren afectación moderada. Valoración en urgencias en tiempo razonable.",
    4: "Datos de alarma o inestabilidad. Prioridad alta para valoración urgente.",
    5: "Riesgo vital o secuela grave. Atención inmediata y reanimación si precisan.",
  };
  const pasosPorNivel: Record<1 | 2 | 3 | 4 | 5, string[]> = {
    1: ["Registrar en lista de espera.", "Indicar medidas generales si aplica.", "Informar signos de alarma."],
    2: ["Valoración en urgencias de baja prioridad o centro de salud.", "Vigilar evolución.", "Repetir triaje si empeoran."],
    3: ["Derivar a urgencias en plazo corto.", "Monitorizar signos vitales.", "No retrasar si aparecen nuevos síntomas."],
    4: ["Acelerar valoración en urgencias.", "Disponer monitorización y vía.", "Considerar aviso a reanimación."],
    5: ["Activar protocolo de reanimación.", "Atención en box de reanimación.", "No demorar medidas de soporte vital."],
  };
  return {
    explicacion_tecnica: explicaciones[nivelGravedad],
    pasos_a_seguir: [recomendacion, ...pasosPorNivel[nivelGravedad]],
    diagnostico_presuntivo: DIAGNOSTICO_PRESUNTIVO_POR_NIVEL[nivelGravedad],
    justificacion: explicaciones[nivelGravedad],
    recomendacion_inmediata: recomendacion,
  };
}

/** Timeout en ms para la llamada a la IA (fallback a Nivel 3 si se supera). */
const TIMEOUT_IA_MS = 15_000;

/** Respuesta de fallback cuando la IA falla o hace timeout: Nivel 3 (Urgencia). */
function respuestaFallbackIA(): RespuestaTriageLLM {
  const nivelGravedad = 3;
  const rec = generarRecomendacion(nivelGravedad);
  const f = fallbackCategorizacion(nivelGravedad, rec);
  return {
    nivel: "Urgencia",
    nivel_gravedad: 3,
    explicacion_tecnica: "Clasificación automática no disponible; valoración en recepción.",
    pasos_a_seguir: f.pasos_a_seguir,
    diagnostico_presuntivo: f.diagnostico_presuntivo,
    justificacion: f.justificacion,
    recomendacion_inmediata: rec,
    fallback: true,
  };
}

/** Categoriza el caso con OpenAI (si OPENAI_API_KEY está definida). Incluye Glasgow; puntaje ≤ 8 tiene prioridad absoluta. */
export async function categorizarConLLM(
  sintomasTexto: string,
  signosVitales?: SignosVitales,
  glasgow?: GlasgowDesglose
): Promise<RespuestaTriageLLM> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey?.trim()) {
    let nivelGravedad = evaluarNivelGravedad(sintomasTexto, signosVitales);
    if (glasgow && glasgow.puntaje_glasgow <= 8) {
      nivelGravedad = glasgow.puntaje_glasgow <= 5 ? 5 : 4;
    }
    const recomendacion = generarRecomendacion(nivelGravedad);
    const nivel: NivelTriageNombre = NIVEL_GRAVEDAD_A_NOMBRE[nivelGravedad];
    const f = fallbackCategorizacion(nivelGravedad, recomendacion);
    return {
      nivel,
      nivel_gravedad: nivelGravedad,
      ...f,
    };
  }

  const signosStr =
    signosVitales && Object.keys(signosVitales).length > 0
      ? ` Signos vitales: ${JSON.stringify(signosVitales)}.`
      : "";

  const glasgowStr = glasgow
    ? ` Escala de Glasgow: puntaje total ${glasgow.puntaje_glasgow} (E=${glasgow.E}, V=${glasgow.V}, M=${glasgow.M}). IMPORTANTE: Si el puntaje de Glasgow es ≤ 8, DEBES asignar prioridad absoluta y clasificar como "Resucitación (Inmediato)" o "Emergencia" sin excepción.`
    : "";

  const prioridadGlasgow =
    glasgow && glasgow.puntaje_glasgow <= 8
      ? " PRIORIDAD ABSOLUTA: El paciente tiene Glasgow ≤ 8 (trauma grave). Clasifica como Resucitación (Inmediato) o Emergencia."
      : "";

  const prompt = `Eres un asistente de triaje médico. Clasifica el caso y devuelve un JSON con la siguiente estructura.

Síntomas descritos: ${sintomasTexto}.${signosStr}${glasgowStr}${prioridadGlasgow}

Responde ÚNICAMENTE con un JSON válido con exactamente estas claves (en español):
- "nivel": número del 1 al 5, donde 1 = No urgente, 2 = Prioritario, 3 = Urgencia, 4 = Emergencia, 5 = Resucitación (Inmediato).
- "diagnostico_presuntivo": una breve hipótesis médica sobre qué condición podría estar causando los síntomas (ej: "Posible cuadro infeccioso", "Reacción alérgica aguda", "Posible deshidratación").
- "justificacion": 1 o 2 frases explicando por qué se eligió ese nivel y ese diagnóstico.
- "recomendacion_inmediata": qué debe hacer el paciente ahora mismo (una o dos frases concretas).`;

  const llamadaIA = async (): Promise<RespuestaTriageLLM> => {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      throw new Error("Respuesta vacía del modelo");
    }

    const parsed = JSON.parse(raw) as {
      nivel?: number | string;
      diagnostico_presuntivo?: string;
      justificacion?: string;
      recomendacion_inmediata?: string;
    };

    const nivelNum =
      typeof parsed.nivel === "number"
        ? Math.min(5, Math.max(1, parsed.nivel))
        : typeof parsed.nivel === "string"
          ? Math.min(5, Math.max(1, parseInt(parsed.nivel, 10) || 3))
          : 3;
    const nivelGravedad = nivelNum as 1 | 2 | 3 | 4 | 5;
    const nivelNombre = NIVEL_GRAVEDAD_A_NOMBRE[nivelGravedad];
    const fallbackF = fallbackCategorizacion(nivelGravedad, generarRecomendacion(nivelGravedad));

    return {
      nivel: nivelNombre,
      nivel_gravedad: nivelGravedad,
      explicacion_tecnica: typeof parsed.justificacion === "string" ? parsed.justificacion.trim() : fallbackF.justificacion,
      pasos_a_seguir: [typeof parsed.recomendacion_inmediata === "string" ? parsed.recomendacion_inmediata.trim() : fallbackF.recomendacion_inmediata],
      diagnostico_presuntivo:
        typeof parsed.diagnostico_presuntivo === "string" && parsed.diagnostico_presuntivo.trim()
          ? parsed.diagnostico_presuntivo.trim()
          : fallbackF.diagnostico_presuntivo,
      justificacion:
        typeof parsed.justificacion === "string" && parsed.justificacion.trim()
          ? parsed.justificacion.trim()
          : fallbackF.justificacion,
      recomendacion_inmediata:
        typeof parsed.recomendacion_inmediata === "string" && parsed.recomendacion_inmediata.trim()
          ? parsed.recomendacion_inmediata.trim()
          : fallbackF.recomendacion_inmediata,
    };
  };

  const timeoutPromise = new Promise<RespuestaTriageLLM>((_, reject) => {
    setTimeout(() => reject(new Error("Timeout IA")), TIMEOUT_IA_MS);
  });

  try {
    const resultado = await Promise.race([llamadaIA(), timeoutPromise]);
    if (glasgow && glasgow.puntaje_glasgow <= 8) {
      const nivelGravedad = resultado.nivel_gravedad ?? nivelNombreAGravedad(resultado.nivel);
      if (nivelGravedad < 4) {
        const ng = glasgow.puntaje_glasgow <= 5 ? 5 : 4;
        const f = fallbackCategorizacion(ng, generarRecomendacion(ng));
        return {
          nivel: NIVEL_GRAVEDAD_A_NOMBRE[ng],
          nivel_gravedad: ng,
          explicacion_tecnica: `Glasgow ${glasgow.puntaje_glasgow}: trauma grave. ${resultado.justificacion ?? resultado.explicacion_tecnica ?? ""}`,
          pasos_a_seguir: resultado.pasos_a_seguir ?? [resultado.recomendacion_inmediata ?? f.recomendacion_inmediata],
          diagnostico_presuntivo: resultado.diagnostico_presuntivo ?? f.diagnostico_presuntivo,
          justificacion: resultado.justificacion ?? f.justificacion,
          recomendacion_inmediata: resultado.recomendacion_inmediata ?? f.recomendacion_inmediata,
        };
      }
    }
    return resultado;
  } catch {
    if (glasgow && glasgow.puntaje_glasgow <= 8) {
      const nivelGravedad = glasgow.puntaje_glasgow <= 5 ? 5 : 4;
      const f = fallbackCategorizacion(nivelGravedad, generarRecomendacion(nivelGravedad));
      return {
        nivel: NIVEL_GRAVEDAD_A_NOMBRE[nivelGravedad],
        nivel_gravedad: nivelGravedad,
        ...f,
      };
    }
    return respuestaFallbackIA();
  }
}

/** Mapea nombre de nivel a nivel_gravedad 1-5 (compatibilidad con mock DB). */
export function nivelNombreAGravedad(nivel: NivelTriageNombre): 1 | 2 | 3 | 4 | 5 {
  const idx = NIVELES_TRIAGE.indexOf(nivel);
  return (Math.min(5, Math.max(1, idx + 1))) as 1 | 2 | 3 | 4 | 5;
}
