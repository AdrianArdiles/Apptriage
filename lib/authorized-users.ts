"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
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
 * Comprueba si el email existe en la lista autorizada. Si es adrianadroco@gmail.com se asigna rol ADMIN automáticamente.
 * Para el resto: primero se busca en authorized_users; si no está, se usa fallback: si el usuario tiene documento
 * en la colección users (por uid), se le permite entrar como PARAMEDICO. Así todos los que se registran pueden usar
 * la app aunque aún no estén en authorized_users.
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
    if (!snapshot.empty) {
      const firstDoc = snapshot.docs[0];
      const data = firstDoc.data();
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
    }
  } catch {
    // Si falla la lectura de authorized_users, seguimos al fallback por users
  }

  return null;
}

/**
 * Obtiene el usuario autorizado: primero por email en authorized_users (o ADMIN hardcoded).
 * Si no está en la lista, permite entrar igual como PARAMEDICO a cualquier usuario autenticado
 * (tenemos email + uid = Firebase Auth válida). Así no dependemos de que exista el doc en users
 * ni de que la colección authorized_users esté poblada.
 */
export async function getAuthorizedUserByEmailOrUserDoc(email: string, uid: string): Promise<AuthorizedUser | null> {
  const fromList = await getAuthorizedUserByEmail(email);
  if (fromList) return fromList;

  if (!email?.trim() || !uid?.trim()) return null;
  return {
    email: email.trim().toLowerCase(),
    rol: "PARAMEDICO",
    nombre: "Operador",
    matricula: "",
  };
}
