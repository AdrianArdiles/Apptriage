import { ref, set, remove, onValue, type Unsubscribe } from "firebase/database";
import { getDb } from "@/lib/firebase";

const PATH_INTERVENCIONES = "intervenciones";

/** Caracteres no permitidos en claves de Firebase Realtime Database */
function sanitizeKey(key: string): string {
  return key.replace(/[.$#[\]/]/g, "_").trim() || "sin-id";
}

export interface IntervencionPayload {
  operadorId: string;
  unidadId: string;
  updatedAt: string;
  currentStep: number;
  paciente_id?: string;
  nombre_paciente?: string;
  dni?: string;
  sintomas_texto?: string;
  xabcde?: Record<string, string>;
  hora_inicio_atencion?: string;
  timestamp_eventos?: { evento: string; hora: string }[];
  glasgow_score?: number;
  hasRCP: boolean;
}

/**
 * Sincroniza el estado actual del protocolo a Firebase en intervenciones/[ID_MOVIL].
 * Solo se ejecuta en el cliente; si no hay unidadId se usa operadorId como fallback.
 */
export function syncIntervencionToFirebase(payload: IntervencionPayload): void {
  const database = getDb();
  if (!database) return;

  const key = sanitizeKey(payload.unidadId || payload.operadorId || "anon");
  const path = `${PATH_INTERVENCIONES}/${key}`;

  set(ref(database, path), payload).catch((err) => {
    console.warn("Firebase sync intervención:", err);
  });
}

/**
 * Elimina la intervención activa de una unidad/operador (p. ej. al enviar el reporte).
 */
export function removeIntervencionFromFirebase(unidadIdOrOperadorId: string): void {
  const database = getDb();
  if (!database || !unidadIdOrOperadorId.trim()) return;
  const key = sanitizeKey(unidadIdOrOperadorId.trim());
  remove(ref(database, `${PATH_INTERVENCIONES}/${key}`)).catch((err) => {
    console.warn("Firebase remove intervención:", err);
  });
}

/**
 * Escucha en tiempo real todos los nodos bajo intervenciones/.
 * callback recibe un mapa { [unidadId]: IntervencionPayload } (o null si no hay datos).
 */
export function subscribeIntervenciones(
  callback: (data: Record<string, IntervencionPayload> | null) => void
): Unsubscribe {
  const database = getDb();
  if (!database) {
    callback(null);
    return () => {};
  }

  const dbRef = ref(database, PATH_INTERVENCIONES);
  return onValue(dbRef, (snapshot) => {
    const val = snapshot.val();
    callback(val ?? null);
  });
}
