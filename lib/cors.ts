/**
 * Encabezados CORS para permitir peticiones desde la app Capacitor (Android).
 * Origen: https://localhost (WebView de Capacitor).
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://localhost",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
  "Access-Control-Max-Age": "86400",
} as const;
