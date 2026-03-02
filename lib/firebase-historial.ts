import { ref, push, get } from "firebase/database";
import { getDb } from "@/lib/firebase";
import type { RegistroTriage } from "@/lib/types";

const PATH_HISTORIAL = "historial_triage";

export interface HistorialTriageEntry {
  id?: string;
  createdAt: string;
  registro: RegistroTriage;
  operadorId?: string;
  unidadId?: string;
}

/**
 * Guarda un registro de triaje finalizado en Firebase (base histórica para estadísticas del Manager).
 * Se llama desde el cliente tras un triaje exitoso.
 */
export function pushHistorialTriage(
  registro: RegistroTriage,
  options?: { operadorId?: string; unidadId?: string }
): void {
  const database = getDb();
  if (!database) return;
  const payload: Omit<HistorialTriageEntry, "id"> = {
    createdAt: new Date().toISOString(),
    registro: { ...registro, fecha: registro.fecha || new Date().toISOString() },
    operadorId: options?.operadorId,
    unidadId: options?.unidadId,
  };
  push(ref(database, PATH_HISTORIAL), payload).catch((err) => {
    console.warn("[Firebase] Error guardando historial triaje:", err?.message ?? err);
  });
}

/**
 * Obtiene todo el historial de triaje desde Firebase. El Manager filtra por fecha en cliente (Hoy/Semana/Mes).
 */
export async function getHistorialTriageAll(): Promise<HistorialTriageEntry[]> {
  const database = getDb();
  if (!database) return [];
  const snapshot = await get(ref(database, PATH_HISTORIAL));
  const val = snapshot.val();
  if (!val || typeof val !== "object") return [];
  return Object.entries(val).map(([id, v]) => {
    const entry = v as HistorialTriageEntry;
    return { ...entry, id };
  });
}
