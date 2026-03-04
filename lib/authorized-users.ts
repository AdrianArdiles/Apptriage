"use client";

import { collection, query, where, getDocs } from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";

export const AUTHORIZED_USERS_COLLECTION = "authorized_users";

export type UserRol = "PARAMEDICO" | "DOCTOR" | "ADMIN";

export interface AuthorizedUser {
  email: string;
  rol: UserRol;
  nombre: string;
  matricula: string;
}

/** Siempre permitido aunque la colección authorized_users esté vacía (para configurar el resto). */
export const ADMIN_EMAIL = "adrianadroco@gmail.com";

/**
 * Comprueba si el email existe en la lista autorizada. Si es adrianadroco@gmail.com se asigna rol ADMIN automáticamente
 * (no requiere documento en Firestore; así podés entrar aunque la colección esté vacía). Para el resto, se busca en
 * la colección authorized_users. Si la colección no existe o hay error, solo adrianadroco puede entrar.
 */
export async function getAuthorizedUserByEmail(email: string): Promise<AuthorizedUser | null> {
  if (!email?.trim()) return null;
  const emailLower = email.trim().toLowerCase();

  if (emailLower === ADMIN_EMAIL) {
    return {
      email: emailLower,
      rol: "ADMIN",
      nombre: "Administrador",
      matricula: "ADMIN",
    };
  }

  const fs = getFirestoreInstance();
  if (!fs) return null;
  try {
    const q = query(
      collection(fs, AUTHORIZED_USERS_COLLECTION),
      where("email", "==", emailLower)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    const rol = data.rol as string;
    if (
      typeof data.email === "string" &&
      typeof data.nombre === "string" &&
      typeof data.matricula === "string" &&
      (rol === "PARAMEDICO" || rol === "DOCTOR" || rol === "ADMIN")
    ) {
      return {
        email: data.email,
        rol: rol as UserRol,
        nombre: String(data.nombre).trim(),
        matricula: String(data.matricula).trim(),
      };
    }
  } catch {
    // Colección vacía, reglas de Firestore o red: no bloquear; solo el ADMIN_EMAIL entra sin Firestore
  }
  return null;
}
