"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categorizarConLLM = categorizarConLLM;
exports.nivelNombreAGravedad = nivelNombreAGravedad;
const openai_1 = __importDefault(require("openai"));
const types_1 = require("./types");
const triage_logic_1 = require("./triage-logic");
const NIVEL_GRAVEDAD_A_NOMBRE = {
    1: "No urgente",
    2: "Prioritario",
    3: "Urgencia",
    4: "Emergencia",
    5: "Resucitación (Inmediato)",
};
const DIAGNOSTICO_PRESUNTIVO_POR_NIVEL = {
    1: "Posible cuadro leve o crónico; sin datos de alarma.",
    2: "Posible deterioro leve o condición que requiere seguimiento.",
    3: "Posible cuadro infeccioso o inflamatorio moderado; valoración recomendada.",
    4: "Posible reacción alérgica aguda, descompensación o cuadro grave; requiere valoración urgente.",
    5: "Posible trauma grave, reanimación o emergencia vital; atención inmediata.",
};
function fallbackCategorizacion(nivelGravedad, recomendacion) {
    const explicaciones = {
        1: "Criterios clínicos y signos vitales dentro de rango. Sin datos de alarma.",
        2: "Situación estable con posible deterioro. Requiere valoración en plazo corto.",
        3: "Datos que sugieren afectación moderada. Valoración en urgencias en tiempo razonable.",
        4: "Datos de alarma o inestabilidad. Prioridad alta para valoración urgente.",
        5: "Riesgo vital o secuela grave. Atención inmediata y reanimación si precisan.",
    };
    const pasosPorNivel = {
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
const TIMEOUT_IA_MS = 15000;
function respuestaFallbackIA() {
    const nivelGravedad = 3;
    const rec = (0, triage_logic_1.generarRecomendacion)(nivelGravedad);
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
async function categorizarConLLM(sintomasTexto, signosVitales, glasgow) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!(apiKey === null || apiKey === void 0 ? void 0 : apiKey.trim())) {
        let nivelGravedad = (0, triage_logic_1.evaluarNivelGravedad)(sintomasTexto, signosVitales);
        if (glasgow && glasgow.puntaje_glasgow <= 8) {
            nivelGravedad = glasgow.puntaje_glasgow <= 5 ? 5 : 4;
        }
        const recomendacion = (0, triage_logic_1.generarRecomendacion)(nivelGravedad);
        const nivel = NIVEL_GRAVEDAD_A_NOMBRE[nivelGravedad];
        const f = fallbackCategorizacion(nivelGravedad, recomendacion);
        return {
            nivel,
            nivel_gravedad: nivelGravedad,
            ...f,
        };
    }
    const signosStr = signosVitales && Object.keys(signosVitales).length > 0
        ? ` Signos vitales: ${JSON.stringify(signosVitales)}.`
        : "";
    const glasgowStr = glasgow
        ? ` Escala de Glasgow: puntaje total ${glasgow.puntaje_glasgow} (E=${glasgow.E}, V=${glasgow.V}, M=${glasgow.M}). IMPORTANTE: Si el puntaje de Glasgow es ≤ 8, DEBES asignar prioridad absoluta y clasificar como "Resucitación (Inmediato)" o "Emergencia" sin excepción.`
        : "";
    const prioridadGlasgow = glasgow && glasgow.puntaje_glasgow <= 8
        ? " PRIORIDAD ABSOLUTA: El paciente tiene Glasgow ≤ 8 (trauma grave). Clasifica como Resucitación (Inmediato) o Emergencia."
        : "";
    const prompt = `Eres un asistente de triaje médico. Clasifica el caso y devuelve un JSON con la siguiente estructura.

Síntomas descritos: ${sintomasTexto}.${signosStr}${glasgowStr}${prioridadGlasgow}

Responde ÚNICAMENTE con un JSON válido con exactamente estas claves (en español):
- "nivel": número del 1 al 5, donde 1 = No urgente, 2 = Prioritario, 3 = Urgencia, 4 = Emergencia, 5 = Resucitación (Inmediato).
- "diagnostico_presuntivo": una breve hipótesis médica sobre qué condición podría estar causando los síntomas (ej: "Posible cuadro infeccioso", "Reacción alérgica aguda", "Posible deshidratación").
- "justificacion": 1 o 2 frases explicando por qué se eligió ese nivel y ese diagnóstico.
- "recomendacion_inmediata": qué debe hacer el paciente ahora mismo (una o dos frases concretas).`;
    const llamadaIA = async () => {
        var _a, _b, _c;
        const openai = new openai_1.default({ apiKey });
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            max_tokens: 500,
        });
        const raw = (_c = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim();
        if (!raw) {
            throw new Error("Respuesta vacía del modelo");
        }
        const parsed = JSON.parse(raw);
        const nivelNum = typeof parsed.nivel === "number"
            ? Math.min(5, Math.max(1, parsed.nivel))
            : typeof parsed.nivel === "string"
                ? Math.min(5, Math.max(1, parseInt(parsed.nivel, 10) || 3))
                : 3;
        const nivelGravedad = nivelNum;
        const nivelNombre = NIVEL_GRAVEDAD_A_NOMBRE[nivelGravedad];
        const fallbackF = fallbackCategorizacion(nivelGravedad, (0, triage_logic_1.generarRecomendacion)(nivelGravedad));
        return {
            nivel: nivelNombre,
            nivel_gravedad: nivelGravedad,
            explicacion_tecnica: typeof parsed.justificacion === "string" ? parsed.justificacion.trim() : fallbackF.justificacion,
            pasos_a_seguir: [typeof parsed.recomendacion_inmediata === "string" ? parsed.recomendacion_inmediata.trim() : fallbackF.recomendacion_inmediata],
            diagnostico_presuntivo: typeof parsed.diagnostico_presuntivo === "string" && parsed.diagnostico_presuntivo.trim()
                ? parsed.diagnostico_presuntivo.trim()
                : fallbackF.diagnostico_presuntivo,
            justificacion: typeof parsed.justificacion === "string" && parsed.justificacion.trim()
                ? parsed.justificacion.trim()
                : fallbackF.justificacion,
            recomendacion_inmediata: typeof parsed.recomendacion_inmediata === "string" && parsed.recomendacion_inmediata.trim()
                ? parsed.recomendacion_inmediata.trim()
                : fallbackF.recomendacion_inmediata,
        };
    };
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout IA")), TIMEOUT_IA_MS);
    });
    try {
        const resultado = await Promise.race([llamadaIA(), timeoutPromise]);
        if (glasgow && glasgow.puntaje_glasgow <= 8) {
            const nivelGravedad = (_a = resultado.nivel_gravedad) !== null && _a !== void 0 ? _a : nivelNombreAGravedad(resultado.nivel);
            if (nivelGravedad < 4) {
                const ng = glasgow.puntaje_glasgow <= 5 ? 5 : 4;
                const f = fallbackCategorizacion(ng, (0, triage_logic_1.generarRecomendacion)(ng));
                return {
                    nivel: NIVEL_GRAVEDAD_A_NOMBRE[ng],
                    nivel_gravedad: ng,
                    explicacion_tecnica: `Glasgow ${glasgow.puntaje_glasgow}: trauma grave. ${(_c = (_b = resultado.justificacion) !== null && _b !== void 0 ? _b : resultado.explicacion_tecnica) !== null && _c !== void 0 ? _c : ""}`,
                    pasos_a_seguir: (_d = resultado.pasos_a_seguir) !== null && _d !== void 0 ? _d : [(_e = resultado.recomendacion_inmediata) !== null && _e !== void 0 ? _e : f.recomendacion_inmediata],
                    diagnostico_presuntivo: (_f = resultado.diagnostico_presuntivo) !== null && _f !== void 0 ? _f : f.diagnostico_presuntivo,
                    justificacion: (_g = resultado.justificacion) !== null && _g !== void 0 ? _g : f.justificacion,
                    recomendacion_inmediata: (_h = resultado.recomendacion_inmediata) !== null && _h !== void 0 ? _h : f.recomendacion_inmediata,
                };
            }
        }
        return resultado;
    }
    catch (_j) {
        if (glasgow && glasgow.puntaje_glasgow <= 8) {
            const nivelGravedad = glasgow.puntaje_glasgow <= 5 ? 5 : 4;
            const f = fallbackCategorizacion(nivelGravedad, (0, triage_logic_1.generarRecomendacion)(nivelGravedad));
            return {
                nivel: NIVEL_GRAVEDAD_A_NOMBRE[nivelGravedad],
                nivel_gravedad: nivelGravedad,
                ...f,
            };
        }
        return respuestaFallbackIA();
    }
}
function nivelNombreAGravedad(nivel) {
    const idx = types_1.NIVELES_TRIAGE.indexOf(nivel);
    return (Math.min(5, Math.max(1, idx + 1)));
}
