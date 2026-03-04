import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import type { EntradaTriage, RegistroTriage, SignosVitales } from "./lib/types";
import { MIN_SINTOMAS_CARACTERES } from "./lib/types";
import { categorizarConLLM, nivelNombreAGravedad } from "./lib/triage-llm";
import { generarRecomendacion } from "./lib/triage-logic";

admin.initializeApp();

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

const COLECCION_TRIAJES = "triajes";

type Res = express.Response;

/** Envía respuesta JSON con CORS. */
function sendJson(res: Res, status: number, data: unknown): void {
  res.set(CORS_HEADERS);
  res.status(status).json(data);
}

/** Responde a preflight OPTIONS. */
function handleOptions(res: Res): void {
  res.set(CORS_HEADERS);
  res.status(204).send("");
}

/** Objeto a documento Firestore: quitar undefined (Firestore no los acepta). */
function toFirestoreDoc(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * POST: recibe body JSON de triaje, categoriza con LLM, guarda en Firestore y devuelve registro.
 * URL: https://<region>-<project>.cloudfunctions.net/apiTriage
 */
const appTriage = express();
appTriage.use(express.json());
appTriage.use((_req, res, next) => {
  res.set(CORS_HEADERS);
  next();
});

appTriage.options("*", (_req, res) => handleOptions(res));

appTriage.post("/", async (req: express.Request, res: Res): Promise<void> => {
  let data: Record<string, unknown>;
  try {
    if (req.body && typeof req.body === "object") {
      data = req.body as Record<string, unknown>;
    } else {
      const raw = typeof req.body === "string" ? req.body : "{}";
      data = JSON.parse(raw) as Record<string, unknown>;
    }
  } catch {
    sendJson(res, 400, { error: "Error de parseo" });
    return;
  }

  if (!data || typeof data !== "object") {
    sendJson(res, 400, { error: "Datos incompletos", recibido: data });
    return;
  }

  const nombreVal = String((data.nombre_paciente ?? data.nombre ?? "").toString()).trim();
  const dniVal = String((data.dni ?? "").toString()).trim();
  const tienePacienteId = "paciente_id" in data && data.paciente_id != null && String(data.paciente_id).trim() !== "";
  const tieneSintomas = "sintomas_texto" in data && data.sintomas_texto != null && String(data.sintomas_texto).trim().length >= MIN_SINTOMAS_CARACTERES;
  const tieneNombre = nombreVal !== "";
  const tieneDni = dniVal !== "";
  const tieneAlgunIdentificador = tieneNombre || tieneDni;

  if (!tienePacienteId || !tieneSintomas || !tieneAlgunIdentificador) {
    sendJson(res, 400, { error: "Datos incompletos", recibido: data });
    return;
  }

  const entrada = data as unknown as EntradaTriage;
  const paciente_id = String(entrada.paciente_id).trim();
  const sintomas_texto = String(entrada.sintomas_texto).trim();
  const signos_vitales: SignosVitales = (entrada.signos_vitales && typeof entrada.signos_vitales === "object") ? entrada.signos_vitales : {};
  const nombre_paciente =
    typeof entrada.nombre_paciente === "string" && entrada.nombre_paciente.trim()
      ? entrada.nombre_paciente.trim()
      : paciente_id;
  const dni = typeof entrada.dni === "string" && entrada.dni.trim() ? entrada.dni.trim() : undefined;
  const glasgow =
    entrada.glasgow &&
    typeof entrada.glasgow.puntaje_glasgow === "number" &&
    typeof entrada.glasgow.E === "number" &&
    typeof entrada.glasgow.V === "number" &&
    typeof entrada.glasgow.M === "number"
      ? {
          E: entrada.glasgow.E,
          V: entrada.glasgow.V,
          M: entrada.glasgow.M,
          puntaje_glasgow: entrada.glasgow.puntaje_glasgow,
        }
      : undefined;
  const hora_inicio_atencion =
    typeof entrada.hora_inicio_atencion === "string" && entrada.hora_inicio_atencion.trim()
      ? entrada.hora_inicio_atencion.trim()
      : undefined;
  const blood_loss = typeof entrada.blood_loss === "string" && entrada.blood_loss.trim() ? entrada.blood_loss.trim() : undefined;
  const airway_status = typeof entrada.airway_status === "string" && entrada.airway_status.trim() ? entrada.airway_status.trim() : undefined;
  const respiration_rate = typeof entrada.respiration_rate === "number" ? entrada.respiration_rate : undefined;
  const pulse = typeof entrada.pulse === "number" ? entrada.pulse : undefined;
  const bp_systolic = typeof entrada.bp_systolic === "number" ? entrada.bp_systolic : undefined;
  const bp_diastolic = typeof entrada.bp_diastolic === "number" ? entrada.bp_diastolic : undefined;
  const glasgow_score = typeof entrada.glasgow_score === "number" ? entrada.glasgow_score : glasgow?.puntaje_glasgow;

  try {
    const resultadoLLM = await categorizarConLLM(sintomas_texto, signos_vitales, glasgow);
    const nivel_gravedad = resultadoLLM.nivel_gravedad ?? nivelNombreAGravedad(resultadoLLM.nivel);
    const recomendacion =
      typeof resultadoLLM.recomendacion_inmediata === "string" && resultadoLLM.recomendacion_inmediata.trim()
        ? resultadoLLM.recomendacion_inmediata.trim()
        : generarRecomendacion(nivel_gravedad);
    const MENSAJE_FALLBACK = "Clasificación automática no disponible, diríjase a recepción";

    const registro: RegistroTriage = {
      paciente_id,
      sintomas_texto,
      nivel_gravedad,
      recomendacion,
      signos_vitales,
      fecha: new Date().toISOString(),
      nivel: resultadoLLM.nivel,
      explicacion_tecnica: resultadoLLM.explicacion_tecnica,
      pasos_a_seguir: resultadoLLM.pasos_a_seguir,
      ...(nombre_paciente ? { nombre_paciente } : {}),
      ...(dni ? { dni } : {}),
      ...(glasgow ? { glasgow } : {}),
      ...(resultadoLLM.diagnostico_presuntivo != null && resultadoLLM.diagnostico_presuntivo !== "" ? { diagnostico_presuntivo: resultadoLLM.diagnostico_presuntivo } : {}),
      ...(resultadoLLM.justificacion != null && resultadoLLM.justificacion !== "" ? { justificacion: resultadoLLM.justificacion } : {}),
      ...(resultadoLLM.recomendacion_inmediata != null && resultadoLLM.recomendacion_inmediata !== "" ? { recomendacion_inmediata: resultadoLLM.recomendacion_inmediata } : {}),
      ...(resultadoLLM.fallback ? { mensaje_fallback: MENSAJE_FALLBACK } : {}),
      ...(hora_inicio_atencion ? { hora_inicio_atencion } : {}),
      ...(blood_loss != null ? { blood_loss } : {}),
      ...(airway_status != null ? { airway_status } : {}),
      ...(respiration_rate != null ? { respiration_rate } : {}),
      ...(pulse != null ? { pulse } : {}),
      ...(bp_systolic != null ? { bp_systolic } : {}),
      ...(bp_diastolic != null ? { bp_diastolic } : {}),
      ...(glasgow_score != null ? { glasgow_score } : {}),
    };

    const db = admin.firestore();
    const docRef = await db.collection(COLECCION_TRIAJES).add(toFirestoreDoc(registro as unknown as Record<string, unknown>));

    sendJson(res, 200, { success: true, registro: { id: docRef.id, ...registro } });
  } catch (err) {
    console.error("Error al procesar triaje:", err);
    sendJson(res, 500, { error: "Error al procesar el triaje" });
  }
});

export const apiTriage = functions.region("us-central1").runWith({
  timeoutSeconds: 60,
  memory: "512MB",
}).https.onRequest(appTriage);

/**
 * GET: lista de pacientes en espera (triajes) ordenados por nivel de gravedad descendente.
 * URL: https://<region>-<project>.cloudfunctions.net/apiDashboardPacientes
 */
const appDashboard = express();
appDashboard.use((_req, res, next) => {
  res.set(CORS_HEADERS);
  next();
});
appDashboard.options("*", (_req, res) => handleOptions(res));
appDashboard.get("/", async (_req: express.Request, res: Res): Promise<void> => {

  try {
    const snapshot = await admin.firestore().collection(COLECCION_TRIAJES).get();
    const todos: RegistroTriage[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        paciente_id: data.paciente_id ?? "",
        sintomas_texto: data.sintomas_texto ?? "",
        nivel_gravedad: data.nivel_gravedad ?? 3,
        recomendacion: data.recomendacion ?? "",
        signos_vitales: (data.signos_vitales as SignosVitales) ?? {},
        fecha: data.fecha ?? new Date().toISOString(),
      } as RegistroTriage;
    });
    const ordenados = [...todos].sort((a, b) => b.nivel_gravedad - a.nivel_gravedad);
    sendJson(res, 200, ordenados);
  } catch (err) {
    console.error("Error al obtener pacientes:", err);
    sendJson(res, 500, { error: "Error al obtener la lista de pacientes" });
  }
});

export const apiDashboardPacientes = functions.region("us-central1").https.onRequest(appDashboard);
