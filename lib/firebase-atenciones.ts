import { ref, set, get, remove } from "firebase/database";
import { getDb } from "@/lib/firebase";
import type { ReportSummaryData } from "@/lib/report-summary";

const PATH_ATENCIONES = "atenciones";

/** Entrada de atención guardada en Firebase (sin fileUri, que es local al dispositivo). */
export interface AtencionFirebaseEntry {
  id: string;
  createdAt: string;
  nombrePaciente: string;
  pacienteId: string;
  operadorId?: string;
  unidadId?: string;
  data: ReportSummaryData;
}

/** Caracteres no permitidos en claves de Firebase Realtime Database */
function sanitizeKey(key: string): string {
  return key.replace(/[.$#[\]/]/g, "_").trim() || "sin-id";
}

/**
 * Guarda una atención con su informe en Firebase. Se llama tras generar el PDF y añadir al historial local.
 */
export function pushAtencionToFirebase(entry: AtencionFirebaseEntry): void {
  const database = getDb();
  if (!database) return;
  const id = sanitizeKey(entry.id);
  const payload: AtencionFirebaseEntry = {
    id: entry.id,
    createdAt: entry.createdAt,
    nombrePaciente: entry.nombrePaciente,
    pacienteId: entry.pacienteId,
    operadorId: entry.operadorId,
    unidadId: entry.unidadId,
    data: entry.data,
  };
  set(ref(database, `${PATH_ATENCIONES}/${id}`), payload).catch((err) => {
    console.warn("[Firebase] Error guardando atención:", err?.message ?? err);
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
