import { CapacitorHttp } from "@capacitor/core";

export const API_BASE_URL = "https://apptriage.vercel.app";

/** URL absoluta del endpoint de triaje (obligatoria para CapacitorHttp en Android). */
export const TRIAGE_API_URL = "https://apptriage.vercel.app/api/triage";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

/**
 * POST a la API de triaje usando solo CapacitorHttp (motor nativo).
 * Evita CORS en el WebView de Android. Parámetros: url absoluta, header Content-Type, payload en data.
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
