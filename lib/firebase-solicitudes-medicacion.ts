import { ref, push, update, onValue, type Unsubscribe } from "firebase/database";
import { getDb } from "@/lib/firebase";

const PATH_SOLICITUDES = "solicitudes_medicacion";

export type EstadoSolicitud = "pendiente" | "aprobado" | "rechazado";

export interface SolicitudMedicacion {
  id?: string;
  createdAt: string;
  movilId: string;
  operadorId?: string;
  pacienteId?: string;
  nombrePaciente?: string;
  medicacion: string;
  justificacion?: string;
  estado: EstadoSolicitud;
  resueltoAt?: string;
  resueltoPor?: string;
}

/** Crea una solicitud de medicación (desde app móvil). */
export function pushSolicitudMedicacion(payload: Omit<SolicitudMedicacion, "id" | "estado">): void {
  const database = getDb();
  if (!database) return;
  const data: Omit<SolicitudMedicacion, "id"> = {
    ...payload,
    estado: "pendiente",
  };
  push(ref(database, PATH_SOLICITUDES), data).catch((err) => {
    console.warn("[Firebase] Error creando solicitud medicación:", err?.message ?? err);
  });
}

/** Escucha en tiempo real las solicitudes (para vista Doctor). */
export function subscribeSolicitudesMedicacion(
  callback: (list: SolicitudMedicacion[]) => void
): Unsubscribe {
  const database = getDb();
  if (!database) {
    callback([]);
    return () => {};
  }
  const dbRef = ref(database, PATH_SOLICITUDES);
  return onValue(dbRef, (snapshot) => {
    const val = snapshot.val();
    if (!val || typeof val !== "object") {
      callback([]);
      return;
    }
    const list = Object.entries(val).map(([id, v]) => ({ ...(v as SolicitudMedicacion), id }));
    callback(list);
  });
}

/** Aprueba o rechaza una solicitud (Doctor). */
export function resolverSolicitud(
  id: string,
  estado: "aprobado" | "rechazado",
  resueltoPor?: string
): void {
  const database = getDb();
  if (!database || !id.trim()) return;
  const updates: Partial<SolicitudMedicacion> = {
    estado,
    resueltoAt: new Date().toISOString(),
    resueltoPor: resueltoPor ?? undefined,
  };
  update(ref(database, `${PATH_SOLICITUDES}/${id}`), updates).catch((err) => {
    console.warn("[Firebase] Error resolviendo solicitud:", err?.message ?? err);
  });
}
