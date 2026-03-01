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
 * POST a la API de triaje.
 * En Android/iOS (APK) usa CapacitorHttp para enviar el body desde el cliente nativo
 * y evitar que el WebView envíe el body vacío en POST cross-origin. En web usa fetch.
 */
export async function postTriage(datos: PayloadTriage): Promise<{
  status: number;
  data: unknown;
}> {
  try {
    console.log("Iniciando envío a: " + TRIAGE_API_URL);
    const body = JSON.stringify(datos);
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.request({
        method: "POST",
        url: TRIAGE_API_URL,
        headers,
        data: JSON.parse(body),
      });
      return {
        status: response.status,
        data: response.data ?? {},
      };
    }

    const response = await fetch(TRIAGE_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(datos),
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
