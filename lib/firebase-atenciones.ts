import { ref, set, get, remove, serverTimestamp } from "firebase/database";
import { getDb } from "@/lib/firebase";
import { cleanObject } from "@/lib/clean-object";
import type { ReportSummaryData } from "@/lib/report-summary";

const PATH_ATENCIONES = "atenciones";

/** Objeto diagnóstico para Firebase (timestamp se rellena con serverTimestamp()). */
export interface DiagnosticoFirebase {
  nombre: string;
  cie11: string;
  timestamp?: unknown;
}

/** Entrada de atención guardada en Firebase (sin fileUri, que es local al dispositivo). */
export interface AtencionFirebaseEntry {
  id: string;
  createdAt: string;
  nombrePaciente: string;
  pacienteId: string;
  operadorId?: string;
  unidadId?: string;
  data: ReportSummaryData;
  /** Código CIE-11 del diagnóstico seleccionado (para que el Manager lo vea al instante). */
  diagnostico_codigo?: string;
}

/** Caracteres no permitidos en claves de Firebase Realtime Database */
function sanitizeKey(key: string): string {
  return key.replace(/[.$#[\]/]/g, "_").trim() || "sin-id";
}

/**
 * Guarda una atención con su informe en Firebase. Devuelve una promesa para poder esperar al envío.
 * Si se pasa diagnostico, se guarda en data y en diagnostico_codigo para que el Manager lo vea al instante.
 */
export function pushAtencionToFirebase(
  entry: AtencionFirebaseEntry,
  diagnostico?: { nombre: string; cie11: string }
): Promise<void> {
  const database = getDb();
  if (!database) return Promise.resolve();
  const id = sanitizeKey(entry.id);
  const dataWithDiagnostico: ReportSummaryData & { diagnostico_firebase?: DiagnosticoFirebase } = {
    ...entry.data,
  };
  if (diagnostico?.nombre) {
    dataWithDiagnostico.diagnostico_firebase = {
      nombre: diagnostico.nombre,
      cie11: diagnostico.cie11 || "",
      timestamp: serverTimestamp(),
    };
  }
  const payload = {
    ...entry,
    data: dataWithDiagnostico,
    diagnostico_codigo: diagnostico?.cie11 ?? entry.diagnostico_codigo ?? undefined,
  };
  const sanitized = cleanObject(payload) as Record<string, unknown>;
  return set(ref(database, `${PATH_ATENCIONES}/${id}`), sanitized).catch((err) => {
    console.warn("[Firebase] Error guardando atención:", err?.message ?? err);
    throw err;
  });
}

/**
 * Obtiene todas las atenciones desde Firebase (para visualizar en la app).
 */
export async function getAtencionesFromFirebase(): Promise<AtencionFirebaseEntry[]> {
  const database = getDb();
  if (!database) return [];
  const snapshot = await get(ref(database, PATH_ATENCIONES));
  const val = snapshot.val();
  if (!val || typeof val !== "object") return [];
  return Object.values(val) as AtencionFirebaseEntry[];
}

/**
 * Elimina una atención de Firebase (p. ej. cuando el usuario la borra del historial).
 */
export function removeAtencionFromFirebase(id: string): void {
  const database = getDb();
  if (!database || !id.trim()) return;
  const key = sanitizeKey(id);
  remove(ref(database, `${PATH_ATENCIONES}/${key}`)).catch((err) => {
    console.warn("[Firebase] Error eliminando atención:", err?.message ?? err);
  });
}
