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
 * Objeto limpio que coincide exactamente con lo que espera el backend (EntradaTriage).
 * Solo incluye: paciente_id, sintomas_texto, nombre_paciente?, dni?, signos_vitales?, glasgow?
 */
export type PayloadTriage = {
  paciente_id: string;
  sintomas_texto: string;
  nombre_paciente?: string;
  dni?: string;
  signos_vitales?: Record<string, unknown>;
  glasgow?: { E: number; V: number; M: number; puntaje_glasgow: number };
};

/**
 * Devuelve un objeto plano para el servidor: números como Number(), textos con || '', signos_vitales como objeto simple.
 */
function cleanData(datos: PayloadTriage): Record<string, unknown> {
  const out: Record<string, unknown> = {
    paciente_id: String(datos.paciente_id ?? "").trim() || "",
    sintomas_texto: String(datos.sintomas_texto ?? "").trim() || "",
  };
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
  return out;
}

/**
 * Función de envío limpia: recibe el objeto de datos, URL con cache-buster, body estrictamente JSON.stringify(data).
 */
async function enviarTriage(data: Record<string, unknown>): Promise<{ status: number; data: unknown }> {
  const url = `https://apptriage.vercel.app/api/triage?t=${Date.now()}`;
  console.log("Enviando datos reales desde el dispositivo:", data);
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
 * POST a la API de triaje. Solo envía datos reales del formulario (nunca payload de prueba).
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
