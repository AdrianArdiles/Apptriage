"use client";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { getAuthInstance } from "@/lib/firebase";
import { getDb } from "@/lib/firebase";

const PATH_USERS = "users";

export interface UserProfile {
  email: string;
  nombre: string;
  apellido: string;
  matricula: string;
  createdAt: string;
}

function sanitizeUid(uid: string): string {
  return uid.replace(/[.$#[\]/]/g, "_").trim() || "anon";
}

/** Iniciar sesión con email y contraseña */
export function signIn(email: string, password: string) {
  const auth = getAuthInstance();
  if (!auth) return Promise.reject(new Error("Firebase Auth no disponible"));
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

/** Registrar nuevo usuario (email y contraseña) */
export function signUp(email: string, password: string) {
  const auth = getAuthInstance();
  if (!auth) return Promise.reject(new Error("Firebase Auth no disponible"));
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}

/** Cerrar sesión */
export function signOut() {
  const auth = getAuthInstance();
  if (!auth) return Promise.resolve();
  return firebaseSignOut(auth);
}

/** Escuchar cambios de autenticación (persistencia de sesión) */
export function onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
  const auth = getAuthInstance();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return firebaseOnAuthStateChanged(auth, callback);
}

/** Obtener perfil del usuario desde Realtime DB (users/[uid]) */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const database = getDb();
  if (!database) return null;
  const key = sanitizeUid(uid);
  const snapshot = await get(ref(database, `${PATH_USERS}/${key}`));
  const val = snapshot.val();
  if (!val || typeof val !== "object") return null;
  const p = val as Record<string, unknown>;
  if (
    typeof p.nombre === "string" &&
    typeof p.apellido === "string" &&
    typeof p.matricula === "string" &&
    typeof p.email === "string"
  ) {
    return {
      email: p.email,
      nombre: p.nombre,
      apellido: p.apellido,
      matricula: p.matricula,
      createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
    };
  }
  return null;
}

/** Guardar perfil profesional (nombre, apellido, matrícula). Se llama la primera vez que inicia sesión. */
export async function setUserProfile(
  uid: string,
  data: { nombre: string; apellido: string; matricula: string; email: string }
): Promise<void> {
  const database = getDb();
  if (!database) throw new Error("Firebase no disponible");
  const key = sanitizeUid(uid);
  const existing = await getUserProfile(uid);
  const payload: UserProfile = {
    email: data.email,
    nombre: data.nombre.trim(),
    apellido: data.apellido.trim(),
    matricula: data.matricula.trim(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await set(ref(database, `${PATH_USERS}/${key}`), payload);
}
