import { ref, set, remove, update, onValue, type Unsubscribe } from "firebase/database";
import { getDb } from "@/lib/firebase";

const PATH_MENSAJES = "mensajes";

function sanitizeKey(key: string): string {
  return key.replace(/[.$#[\]/]/g, "_").trim() || "sin-id";
}

export interface MensajePayload {
  text: string;
  sentAt: string;
  leido?: boolean;
  leidoAt?: string;
}

/**
 * Envía un mensaje del Manager a la unidad/móvil en mensajes/[ID_MOVIL].
 */
export function sendMensaje(movilId: string, text: string): void {
  const database = getDb();
  if (!database || !text.trim()) return;
  const key = sanitizeKey(movilId.trim());
  const path = `${PATH_MENSAJES}/${key}`;
  const payload: MensajePayload = {
    text: text.trim(),
    sentAt: new Date().toISOString(),
  };
  set(ref(database, path), payload).catch((err) => {
    console.warn("Firebase send mensaje:", err);
  });
}

/**
 * Escucha en tiempo real el mensaje para una unidad (mensajes/[ID_MOVIL]).
 * El id debe ser el mismo que usa el Manager (unidadId o operadorId sin sanitizar; se sanitiza aquí).
 */
export function subscribeMensajes(
  movilId: string,
  callback: (data: MensajePayload | null) => void
): Unsubscribe {
  const database = getDb();
  if (!database || !movilId.trim()) {
    callback(null);
    return () => {};
  }
  const key = sanitizeKey(movilId.trim());
  const dbRef = ref(database, `${PATH_MENSAJES}/${key}`);
  return onValue(dbRef, (snapshot) => {
    const val = snapshot.val();
    callback(val ?? null);
  });
}

/**
 * Marca el mensaje como leído (acuse de recibo). El Manager verá "Leído".
 */
export function markAsRead(movilId: string): void {
  const database = getDb();
  if (!database || !movilId.trim()) return;
  const key = sanitizeKey(movilId.trim());
  const path = `${PATH_MENSAJES}/${key}`;
  update(ref(database, path), {
    leido: true,
    leidoAt: new Date().toISOString(),
  }).catch((err) => {
    console.warn("Firebase markAsRead:", err);
  });
}

/**
 * Borra el mensaje para esa unidad (por si se necesita limpiar).
 */
export function clearMensaje(movilId: string): void {
  const database = getDb();
  if (!database || !movilId.trim()) return;
  const key = sanitizeKey(movilId.trim());
  remove(ref(database, `${PATH_MENSAJES}/${key}`)).catch((err) => {
    console.warn("Firebase clear mensaje:", err);
  });
}

/**
 * Escucha todos los mensajes (para el Manager: mostrar "Leído" por unidad).
 */
export function subscribeAllMensajes(
  callback: (data: Record<string, MensajePayload> | null) => void
): Unsubscribe {
  const database = getDb();
  if (!database) {
    callback(null);
    return () => {};
  }
  const dbRef = ref(database, PATH_MENSAJES);
  return onValue(dbRef, (snapshot) => {
    const val = snapshot.val();
    callback(val ?? null);
  });
}
