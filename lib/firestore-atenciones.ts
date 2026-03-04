"use client";

import { collection, addDoc } from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";
import type { ReportSummaryData } from "@/lib/report-summary";

export const FIRESTORE_ATENCIONES_COLLECTION = "atenciones";

export interface AtencionFirestorePayload {
  id: string;
  createdAt: string;
  nombrePaciente: string;
  pacienteId: string;
  /** Nombre del paramédico logueado (atendido por). */
  paramedicoNombre: string;
  /** Email del usuario logueado (Firebase Auth). */
  paramedicoEmail?: string;
  operadorId?: string;
  unidadId?: string;
  data: ReportSummaryData;
  diagnostico_codigo?: string;
}

/**
 * Guarda el informe de la atención en la colección Firestore `atenciones`, con timestamp, nombre y email del usuario.
 * Se llama al "Finalizar Atención" junto con pushAtencionToFirebase (Realtime DB).
 */
export async function pushAtencionToFirestore(
  entry: Omit<AtencionFirestorePayload, "paramedicoNombre" | "paramedicoEmail">,
  options: { paramedicoNombre: string; paramedicoEmail?: string }
): Promise<void> {
  const fs = getFirestoreInstance();
  if (!fs) throw new Error("Firestore no disponible");
  const payload: AtencionFirestorePayload = {
    ...entry,
    paramedicoNombre: (options.paramedicoNombre || "").trim() || "Paramédico",
    ...(options.paramedicoEmail != null && options.paramedicoEmail !== "" ? { paramedicoEmail: options.paramedicoEmail.trim() } : {}),
  };
  await addDoc(collection(fs, FIRESTORE_ATENCIONES_COLLECTION), payload);
}
