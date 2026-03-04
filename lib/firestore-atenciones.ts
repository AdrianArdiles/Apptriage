"use client";

import { collection, addDoc } from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";
import { cleanObject, cleanFirestoreObject } from "@/lib/clean-object";
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

/** Usa la función global cleanObject (undefined/null → ""). */
export function sanitizeData(value: unknown): unknown {
  return cleanObject(value);
}

/** Alias por compatibilidad. */
export function prepareDataForFirestore(value: unknown): unknown {
  return cleanObject(value);
}

/**
 * Guarda en Firestore. Secuencia: 1) Sanitizar (undefined/null → "") 2) addDoc 3) Solo si hay éxito, el caller dispara PDF.
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
  const cleaned = cleanFirestoreObject(payload) as AtencionFirestorePayload;
  console.log("[Firestore] Objeto a guardar en atenciones:", JSON.stringify(cleaned, null, 2));
  try {
    await addDoc(collection(fs, FIRESTORE_ATENCIONES_COLLECTION), cleaned);
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    const message = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : String(err);
    console.error("[Firestore atenciones] Error al guardar:", { code, message }, err);
    throw err;
  }
}
