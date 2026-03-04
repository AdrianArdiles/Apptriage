"use client";

import { doc, setDoc } from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";
import { AUTHORIZED_USERS_COLLECTION, ADMIN_EMAIL, type UserRol } from "@/lib/authorized-users";

export interface SeedAdminResult {
  ok: boolean;
  message: string;
}

/**
 * Crea el primer documento de administrador en la colección authorized_users (Firestore).
 * Podés llamarla desde la consola del navegador estando logueado como admin:
 *   await window.crearPrimerAdminFirestore()
 */
export async function crearPrimerAdminEnFirestore(): Promise<SeedAdminResult> {
  const fs = getFirestoreInstance();
  if (!fs) {
    return { ok: false, message: "Firestore no disponible (¿estás en el navegador?)." };
  }
  const docId = "admin_" + ADMIN_EMAIL.replace(/[.@]/g, "_");
  const payload = {
    email: ADMIN_EMAIL,
    rol: "ADMIN" as UserRol,
    nombre: "Administrador",
    matricula: "ADMIN",
  };
  try {
    await setDoc(doc(fs, AUTHORIZED_USERS_COLLECTION, docId), payload);
    return { ok: true, message: `Documento creado en ${AUTHORIZED_USERS_COLLECTION}/${docId}. Ya podés agregar más usuarios desde la consola de Firestore.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: "Error al escribir en Firestore: " + msg };
  }
}

declare global {
  interface Window {
    crearPrimerAdminFirestore?: () => Promise<SeedAdminResult>;
  }
}
