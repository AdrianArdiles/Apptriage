import { Capacitor } from "@capacitor/core";
import { CapacitorHttp } from "@capacitor/core";

export const API_BASE_URL = "https://apptriage.vercel.app";

/** URL absoluta sin barra final (evita redirección 301/302 que rompe POST en Android). */
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
 * POST a la API de triaje.
 * En Android/iOS (APK) usa CapacitorHttp para enviar el body desde el cliente nativo
 * y evitar que el WebView envíe el body vacío en POST cross-origin. En web usa fetch.
 */
export async function postTriage(datos: PayloadTriage): Promise<{
  status: number;
  data: unknown;
}> {
  try {
    const formData = cleanData(datos);
    console.log("Datos reales a enviar:", JSON.stringify(formData));
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.request({
        method: "POST",
        url: TRIAGE_API_URL,
        headers,
        data: formData,
      });
      return {
        status: response.status,
        data: response.data ?? {},
      };
    }

    const response = await fetch(TRIAGE_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(formData),
    });
    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      data,
    };
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
