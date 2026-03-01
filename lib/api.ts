import { CapacitorHttp } from "@capacitor/core";

/**
 * URL base de la API (absoluta para CapacitorHttp en Android y evitar CORS en el WebView).
 */
export const API_BASE_URL = "https://apptriage.vercel.app";

/** URL absoluta del endpoint de triaje (requerida por CapacitorHttp nativo). */
export const TRIAGE_API_URL = "https://apptriage.vercel.app/api/triage";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

/**
 * Envía el formulario de triaje usando el motor nativo de Capacitor (evita CORS en Android).
 * Retorna status y data de la respuesta; el llamador debe comprobar status y usar data.
 */
export async function postTriage(data: Record<string, unknown>): Promise<{
  status: number;
  data: unknown;
}> {
  const response = await CapacitorHttp.post({
    url: TRIAGE_API_URL,
    headers: {
      "Content-Type": "application/json",
    },
    data,
  });
  return {
    status: response.status,
    data: response.data,
  };
}
