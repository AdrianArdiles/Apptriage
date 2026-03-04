"use client";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { Capacitor } from "@capacitor/core";
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

/**
 * ID de cliente web para Google Sign-In (serverClientId).
 * Definí en .env.local: NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=tu_id.apps.googleusercontent.com
 */
export const GOOGLE_WEB_CLIENT_ID =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()) ||
  "882958082764-d5ddvhafpj21gbn583a6ds7bsa1cj3ds.apps.googleusercontent.com";

/** True solo después de haber llamado GoogleAuth.initialize en esta sesión (nativo). Evita NullPointerException en signOut. */
let _googleAuthInitialized = false;

/**
 * Inicializa el cliente de Google Auth en nativo con serverClientId. Debe ejecutarse al arrancar la app
 * (o antes del primer signIn con Google) para que signOut no dispare un crash por cliente null.
 */
export async function ensureGoogleAuthInitialized(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (_googleAuthInitialized) return true;
  const clientId = GOOGLE_WEB_CLIENT_ID.trim();
  if (!clientId || clientId === "TU_ID_WEB_AQUÍ") return false;
  try {
    const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
    if (typeof GoogleAuth.initialize === "function") {
      await GoogleAuth.initialize({
        scopes: ["profile", "email"],
        clientId,
        serverClientId: clientId,
        androidClientId: clientId,
      } as Parameters<typeof GoogleAuth.initialize>[0]);
      _googleAuthInitialized = true;
      return true;
    }
  } catch {
    // plugin no disponible o fallo de red
  }
  return false;
}

/** Iniciar sesión con Google. En nativo usa el plugin (inicializado antes); en web popup. */
export async function signInWithGoogle() {
  const auth = getAuthInstance();
  if (!auth) return Promise.reject(new Error("Firebase Auth no disponible"));

  if (Capacitor.isNativePlatform()) {
    const ok = await ensureGoogleAuthInitialized();
    if (!ok) {
      return Promise.reject(new Error("No se pudo inicializar Google Auth. Revisá NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID en .env.local"));
    }
    try {
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser.authentication?.idToken;
      if (!idToken) return Promise.reject(new Error("No se obtuvo el token de Google"));
      const credential = GoogleAuthProvider.credential(idToken);
      return signInWithCredential(auth, credential);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return Promise.reject(new Error(msg));
    }
  }

  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

/**
 * Cerrar sesión. Guarda de seguridad: solo se intenta GoogleAuth.signOut() en WEB y cuando
 * el cliente de Google fue inicializado correctamente (no null). En nativo (Capacitor/Android)
 * NUNCA se llama a GoogleAuth.signOut() para evitar crash fatal (NullPointerException en
 * GoogleAuth.java cuando GoogleSignInClient es null, p. ej. usuario logueado por Email).
 */
export async function signOut(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    _googleAuthInitialized = false;
    // Solo Firebase Auth; no tocar el plugin en nativo
  } else {
    try {
      if (_googleAuthInitialized) {
        try {
          const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
          if (GoogleAuth && typeof GoogleAuth.signOut === "function") await GoogleAuth.signOut();
        } catch {
          /* ignorar */
        }
        _googleAuthInitialized = false;
      }
    } catch {
      /* nunca fallar el signOut por el plugin */
    }
  }
  const auth = getAuthInstance();
  if (auth) await firebaseSignOut(auth);
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
