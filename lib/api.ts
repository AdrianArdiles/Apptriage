import { CapacitorHttp } from "@capacitor/core";

export const API_BASE_URL = "https://apptriage.vercel.app";

/** URL absoluta sin barra final (evita redirección 301/302 que rompe POST en Android). */
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
    console.log("Iniciando envío a: " + TRIAGE_API_URL);
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
