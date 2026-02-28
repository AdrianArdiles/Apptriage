/**
 * URL base de la API. Todas las llamadas fetch deben usar esta base.
 */
export const API_BASE_URL = "https://apptriage.vercel.app";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}
