import { Capacitor } from "@capacitor/core";
import { CapacitorHttp } from "@capacitor/core";

/**
 * Base URL de la API. Resolución:
 * - NEXT_PUBLIC_API_URL definida → se usa (obligatorio para APK en producción).
 * - Navegador en localhost (desarrollo) → mismo origen (window.location).
 * - Resto → fallback apptriage.vercel.app.
 */
function getApiBaseUrl(): string {
  const fromEnv = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (
    typeof window !== "undefined" &&
    !Capacitor.isNativePlatform() &&
    window.location?.hostname === "localhost"
  ) {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return "https://apptriage.vercel.app";
}

const API_BASE_URL = getApiBaseUrl();

export { API_BASE_URL };

/** URL absoluta del endpoint de triaje (POST). */
export const TRIAGE_API_URL = `${API_BASE_URL}/api/triage`;

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalized}`;
}

/** URL del endpoint de atenciones (Finalizar Atención - Opción D). */
export const ATENCIONES_API_URL = `${getApiBaseUrl()}/api/atenciones`;

export type { AtencionFromApi } from "@/lib/types-atenciones-api";

/**
 * Lista atenciones desde Neon (GET /api/atenciones). Orden por fecha descendente.
 */
export async function getAtencionesFromApi(): Promise<import("@/lib/types-atenciones-api").AtencionFromApi[]> {
  try {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.request({
        method: "GET",
        url: ATENCIONES_API_URL,
        headers: { Accept: "application/json" },
      });
      const data = response.data;
      return Array.isArray(data) ? (data as import("@/lib/types-atenciones-api").AtencionFromApi[]) : [];
    }
    const response = await fetch(ATENCIONES_API_URL, { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? (data as import("@/lib/types-atenciones-api").AtencionFromApi[]) : [];
  } catch {
    return [];
  }
}

/**
 * Elimina una atención en Neon (DELETE /api/atenciones?id=atencionId).
 */
export async function deleteAtencionApi(atencionId: string): Promise<{ ok: boolean }> {
  const url = `${ATENCIONES_API_URL}?id=${encodeURIComponent(atencionId)}`;
  try {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.request({ method: "DELETE", url, headers: { Accept: "application/json" } });
      return { ok: response.status >= 200 && response.status < 300 };
    }
    const response = await fetch(url, { method: "DELETE", headers: { Accept: "application/json" } });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/** URL del endpoint de sync de usuarios (tras login/registro Firebase). */
const USERS_SYNC_URL = `${getApiBaseUrl()}/api/users/sync`;

/**
 * Sincroniza el usuario con Neon (upsert por uid). Se llama tras autenticación exitosa (Google o Email).
 * No lanza; si falla solo se registra en consola.
 */
export async function syncUserToBackend(uid: string, email: string): Promise<void> {
  const payload = { uid: uid.trim(), email: (email ?? "").trim() };
  try {
    if (Capacitor.isNativePlatform()) {
      await CapacitorHttp.request({
        method: "POST",
        url: USERS_SYNC_URL,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        data: payload,
      });
    } else {
      await fetch(USERS_SYNC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
    }
  } catch (e) {
    console.warn("[syncUserToBackend] No se pudo sincronizar con el backend:", e);
  }
}

const POST_ATENCION_TIMEOUT_MS = 15000;

/**
 * Envía una atención a la API de Vercel (POST /api/atenciones).
 * Timeout 15 s con AbortController (web) o Promise.race (nativo). En error de red o timeout lanza.
 * Devuelve { status, data } solo si hubo respuesta; 200/201 = éxito.
 */
export async function postAtencion(payload: Record<string, unknown>): Promise<{ status: number; data: { id?: string; report_id?: string | null; error?: string } }> {
  const url = ATENCIONES_API_URL;
  const headers = { "Content-Type": "application/json", Accept: "application/json" };

  if (Capacitor.isNativePlatform()) {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("TIMEOUT")), POST_ATENCION_TIMEOUT_MS);
    });
    const requestPromise = (async () => {
      const response = await CapacitorHttp.request({
        method: "POST",
        url,
        headers,
        data: payload,
      });
      const data = (response.data ?? {}) as { id?: string; report_id?: string | null; error?: string };
      return { status: response.status, data };
    })();
    const result = await Promise.race([requestPromise, timeoutPromise]);
    return result;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POST_ATENCION_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = (await response.json().catch(() => ({}))) as { id?: string; report_id?: string | null; error?: string };
    return { status: response.status, data };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("TIMEOUT");
    }
    throw e;
  }
}

/**
 * Objeto para la API: Ficha clínica digital ambulancia (XABCDE).
 * Incluye: blood_loss, airway_status, respiration_rate, pulse, bp_systolic, bp_diastolic, glasgow_score, etc.
 */
export type PayloadTriage = {
  paciente_id: string;
  sintomas_texto: string;
  hora_inicio_atencion?: string;
  nombre_paciente?: string;
  dni?: string;
  signos_vitales?: Record<string, unknown>;
  glasgow?: { E: number; V: number; M: number; puntaje_glasgow: number };
  blood_loss?: string;
  airway_status?: string;
  respiration_rate?: number;
  pulse?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  glasgow_score?: number;
};

/**
 * Devuelve un objeto plano para el servidor: números como Number(), textos con || '', signos_vitales como objeto simple.
 */
function cleanData(datos: PayloadTriage): Record<string, unknown> {
  const out: Record<string, unknown> = {
    paciente_id: String(datos.paciente_id ?? "").trim() || "",
    sintomas_texto: String(datos.sintomas_texto ?? "").trim() || "",
  };
  if (datos.hora_inicio_atencion) out.hora_inicio_atencion = String(datos.hora_inicio_atencion).trim();
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
  if (datos.glasgow_score != null) out.glasgow_score = Number(datos.glasgow_score);
  if (datos.blood_loss != null && String(datos.blood_loss).trim() !== "") out.blood_loss = String(datos.blood_loss).trim();
  if (datos.airway_status != null && String(datos.airway_status).trim() !== "") out.airway_status = String(datos.airway_status).trim();
  if (datos.respiration_rate != null) out.respiration_rate = Number(datos.respiration_rate);
  if (datos.pulse != null) out.pulse = Number(datos.pulse);
  if (datos.bp_systolic != null) out.bp_systolic = Number(datos.bp_systolic);
  if (datos.bp_diastolic != null) out.bp_diastolic = Number(datos.bp_diastolic);
  return out;
}

/**
 * Envía solo el objeto data del formulario a la API en Vercel. Sin payload de prueba ni test: true.
 * En caso de error de red (sin conexión), devuelve { status: 0, data: {} } para que la cola pueda reintentar.
 */
async function enviarTriage(data: Record<string, unknown>): Promise<{ status: number; data: unknown }> {
  const url = `${TRIAGE_API_URL}?t=${Date.now()}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
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
  } catch {
    return { status: 0, data: {} };
  }
}

/**
 * Envía un payload a la API. Usado por la página y por la cola de reportes.
 * Si no hay conexión devuelve { status: 0 }. No muestra alertas.
 */
export async function sendTriagePayload(datos: PayloadTriage): Promise<{ status: number; data: unknown }> {
  const data = cleanData(datos);
  if (!String(data.paciente_id ?? "").trim() || !String(data.sintomas_texto ?? "").trim()) {
    throw new Error("Faltan paciente_id o sintomas_texto en los datos del formulario.");
  }
  return enviarTriage(data);
}

/**
 * POST a la API de triaje. Envía únicamente el objeto data que viene del formulario (sin test ni hardcode).
 * Si no hay conexión (status 0), lanza error con mensaje SIN_CONEXION para que la página encole el reporte.
 */
export async function postTriage(datos: PayloadTriage): Promise<{
  status: number;
  data: unknown;
}> {
  try {
    const result = await sendTriagePayload(datos);
    if (result.status === 0) {
      const err = new Error("SIN_CONEXION") as Error & { code?: string };
      err.code = "SIN_CONEXION";
      throw err;
    }
    if (result.status >= 200 && result.status < 300) return result;
    const errMsg =
      typeof result.data === "object" && result.data !== null && "error" in result.data
        ? String((result.data as { error: unknown }).error)
        : `Error ${result.status}`;
    alert(`Error del servidor: ${errMsg}`);
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === "SIN_CONEXION") throw error;
    const e = error instanceof Error ? error : new Error(String(error));
    alert(`Error técnico: ${e.message}`);
    throw error;
  }
}
