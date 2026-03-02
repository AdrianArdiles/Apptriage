import { ref, update, remove, onValue, type Unsubscribe } from "firebase/database";
import { getDb } from "@/lib/firebase";

const PATH_INTERVENCIONES = "intervenciones";

/** Caracteres no permitidos en claves de Firebase Realtime Database */
function sanitizeKey(key: string): string {
  return key.replace(/[.$#[\]/]/g, "_").trim() || "sin-id";
}

export interface UbicacionPayload {
  lat: number;
  lng: number;
  updatedAt: string;
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
  ubicacion?: UbicacionPayload;
  /** Firma del paramédico logueado (Nombre Apellido - Matrícula) */
  atendido_por?: string;
}

/**
 * Sincroniza el estado actual del protocolo a Firebase en intervenciones/[ID_MOVIL].
 * Usa update() para fusionar con datos existentes. Solo se ejecuta en el cliente.
 * Devuelve una promesa que rechaza si falla (para que el caller pueda mostrar "Guardado localmente").
 */
export function syncIntervencionToFirebase(payload: IntervencionPayload): Promise<void> {
  const database = getDb();
  if (!database) {
    const err = new Error("Firebase no disponible");
    console.warn("[Firebase]", err.message);
    return Promise.reject(err);
  }

  const movilID = sanitizeKey(payload.unidadId || payload.operadorId || "anon");
  const path = `${PATH_INTERVENCIONES}/${movilID}`;
  const datos = { ...payload };

  return update(ref(database, path), datos).catch((err) => {
    console.error("[Firebase] Error sincronizando intervención:", err?.message ?? err);
    throw err;
  });
}

/**
 * Actualiza solo la ubicación GPS en intervenciones/[ID_MOVIL]/ubicacion.
 * El Manager recibe los cambios en tiempo real vía subscribeIntervenciones.
 */
export function syncUbicacionToFirebase(
  movilId: string,
  lat: number,
  lng: number
): void {
  const database = getDb();
  if (!database || !movilId.trim()) return;
  const key = sanitizeKey(movilId.trim());
  const path = `${PATH_INTERVENCIONES}/${key}/ubicacion`;
  const payload: UbicacionPayload = {
    lat,
    lng,
    updatedAt: new Date().toISOString(),
  };
  update(ref(database, path), payload).catch((err) => {
    console.warn("[Firebase] Error sincronizando ubicación:", err?.message ?? err);
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
 * Escucha en tiempo real todos los nodos bajo intervenciones/ (onValue).
 * Mapea todas las intervenciones activas: si un móvil está logueado y sincroniza, aparece aquí.
 * callback recibe un mapa { [movilID]: IntervencionPayload } (o null si no hay datos).
 * onError se llama si hay error de conexión (opcional, para debug visual).
 */
export function subscribeIntervenciones(
  callback: (data: Record<string, IntervencionPayload> | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const database = getDb();
  if (!database) {
    const err = new Error("Firebase no disponible. Verifica databaseURL en firebase.ts");
    console.warn("[Firebase]", err.message);
    onError?.(err);
    callback(null);
    return () => {};
  }

  const dbRef = ref(database, PATH_INTERVENCIONES);
  return onValue(
    dbRef,
    (snapshot) => {
      const val = snapshot.val();
      callback(val ?? null);
    },
    (err) => {
      console.error("[Firebase] Error leyendo intervenciones:", err.message);
      onError?.(err);
      callback(null);
    }
  );
}
