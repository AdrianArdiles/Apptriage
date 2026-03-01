import { CapacitorHttp } from "@capacitor/core";

export const API_BASE_URL = "https://apptriage.vercel.app";

/** URL absoluta del endpoint de triaje (obligatoria para CapacitorHttp en Android). */
export const TRIAGE_API_URL = "https://apptriage.vercel.app/api/triage";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

/**
 * POST a la API de triaje con CapacitorHttp (motor nativo).
 * url absoluta, header Content-Type, payload en data.
 * En caso de error, muestra alert() con el mensaje y el objeto completo para depurar en el celular.
 */
export async function postTriage(data: Record<string, unknown>): Promise<{
  status: number;
  data: unknown;
}> {
  try {
    const response = await CapacitorHttp.post({
      url: "https://apptriage.vercel.app/api/triage",
      headers: {
        "Content-Type": "application/json",
      },
      data,
    });
    return {
      status: response.status,
      data: response.data,
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
