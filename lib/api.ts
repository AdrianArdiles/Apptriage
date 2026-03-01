import { Capacitor } from "@capacitor/core";
import { CapacitorHttp } from "@capacitor/core";

export const API_BASE_URL = "https://apptriage.vercel.app";

/** URL absoluta sin barra final. */
export const TRIAGE_API_URL = "https://apptriage.vercel.app/api/triage";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

/**
 * Objeto para la API: Ficha clínica digital ambulancia (XABCDE).
 * Incluye: blood_loss, airway_status, respiration_rate, pulse, bp_systolic, bp_diastolic, glasgow_score, etc.
 */
export type PayloadTriage = {
  paciente_id: string;
  sintomas_texto: string;
  hora_inicio_atencion?: string;
  nombre_paciente?: string;
  dni?: string;
  signos_vitales?: Record<string, unknown>;
  glasgow?: { E: number; V: number; M: number; puntaje_glasgow: number };
  blood_loss?: string;
  airway_status?: string;
  respiration_rate?: number;
  pulse?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  glasgow_score?: number;
};

/**
 * Devuelve un objeto plano para el servidor: números como Number(), textos con || '', signos_vitales como objeto simple.
 */
function cleanData(datos: PayloadTriage): Record<string, unknown> {
  const out: Record<string, unknown> = {
    paciente_id: String(datos.paciente_id ?? "").trim() || "",
    sintomas_texto: String(datos.sintomas_texto ?? "").trim() || "",
  };
  if (datos.hora_inicio_atencion) out.hora_inicio_atencion = String(datos.hora_inicio_atencion).trim();
  out.nombre_paciente = String(datos.nombre_paciente ?? "").trim() || "";
  out.dni = String(datos.dni ?? "").trim() || "";
  if (datos.signos_vitales && typeof datos.signos_vitales === "object") {
    const sv: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(datos.signos_vitales)) {
      sv[k] = typeof v === "number" ? Number(v) : String(v ?? "").trim() || "";
    }
    out.signos_vitales = sv;
  }
  if (datos.glasgow && typeof datos.glasgow === "object") {
    out.glasgow = {
      E: Number(datos.glasgow.E),
      V: Number(datos.glasgow.V),
      M: Number(datos.glasgow.M),
      puntaje_glasgow: Number(datos.glasgow.puntaje_glasgow),
    };
  }
  if (datos.glasgow_score != null) out.glasgow_score = Number(datos.glasgow_score);
  if (datos.blood_loss != null && String(datos.blood_loss).trim() !== "") out.blood_loss = String(datos.blood_loss).trim();
  if (datos.airway_status != null && String(datos.airway_status).trim() !== "") out.airway_status = String(datos.airway_status).trim();
  if (datos.respiration_rate != null) out.respiration_rate = Number(datos.respiration_rate);
  if (datos.pulse != null) out.pulse = Number(datos.pulse);
  if (datos.bp_systolic != null) out.bp_systolic = Number(datos.bp_systolic);
  if (datos.bp_diastolic != null) out.bp_diastolic = Number(datos.bp_diastolic);
  return out;
}

/**
 * Envía solo el objeto data del formulario a la API en Vercel. Sin payload de prueba ni test: true.
 */
async function enviarTriage(data: Record<string, unknown>): Promise<{ status: number; data: unknown }> {
  const url = `${TRIAGE_API_URL}?t=${Date.now()}`;
  console.log("Datos a enviar:", data);
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.request({
      method: "POST",
      url,
      headers,
      data,
    });
    return { status: response.status, data: response.data ?? {} };
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  const resData = await response.json().catch(() => ({}));
  return { status: response.status, data: resData };
}

/**
 * POST a la API de triaje. Envía únicamente el objeto data que viene del formulario (sin test ni hardcode).
 */
export async function postTriage(datos: PayloadTriage): Promise<{
  status: number;
  data: unknown;
}> {
  try {
    const data = cleanData(datos);
    if (!String(data.paciente_id ?? "").trim() || !String(data.sintomas_texto ?? "").trim()) {
      throw new Error("Faltan paciente_id o sintomas_texto en los datos del formulario.");
    }
    return enviarTriage(data);
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    const mensaje = e.message || "Error desconocido";
    const detalle =
      e.stack ||
      (typeof error === "object" ? JSON.stringify(error, null, 2) : String(error));
    alert(`Error técnico: ${mensaje}`);
    alert(`Objeto completo:\n${detalle}`);
    throw error;
  }
}
