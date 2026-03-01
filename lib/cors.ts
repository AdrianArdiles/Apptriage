/**
 * Encabezados CORS permisivos para API desde app Capacitor (Android/emulador)
 * y cualquier origen (navegador, Postman, etc.).
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
