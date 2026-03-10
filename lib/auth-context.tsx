"use client";

import * as React from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, ensureGoogleAuthInitialized, type UserProfile } from "@/lib/firebase-auth";
import { getAuthorizedUserByEmailOrUserDoc, type AuthorizedUser } from "@/lib/authorized-users";
import { ensureUserDocument } from "@/lib/firestore-users";
import { syncFromProfile, clearOperadorId } from "@/lib/operador-storage";
import { syncUserToBackend } from "@/lib/api";
import { crearPrimerAdminEnFirestore } from "@/lib/seed-authorized-admin";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  /** Usuario autorizado en Firestore (authorized_users). Null si no está en la lista. */
  authorizedUser: AuthorizedUser | null;
  loading: boolean;
  /** true cuando hay user pero no está en authorized_users (acceso bloqueado). */
  isUnauthorized: boolean;
  /** Mensaje de error al verificar autorización o al cargar sesión (evita pantalla en blanco). */
  authError: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      profile: null,
      authorizedUser: null,
      loading: true,
      isUnauthorized: false,
      authError: null,
      refreshProfile: async () => {},
    };
  }
  return ctx;
}

function authorizedToProfile(a: AuthorizedUser): UserProfile {
  return {
    email: a.email,
    nombre: a.nombre,
    apellido: "",
    matricula: a.matricula,
    createdAt: new Date().toISOString(),
  };
}

const AUTH_ERROR_VERIFY = "No se pudo verificar la autorización. Revisá la conexión e intentá de nuevo.";

/** Detecta errores de Firestore por offline / transport (no cerrar sesión ni bloquear entrada). */
function isFirestoreOfflineError(e: unknown): boolean {
  if (e && typeof e === "object" && "code" in e) {
    const code = String((e as { code: string }).code);
    if (code === "unavailable") return true;
  }
  const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : String(e);
  return /transport errored|client is offline|failed to get document|connection/i.test(msg);
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [authorizedUser, setAuthorizedUser] = React.useState<AuthorizedUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    ensureGoogleAuthInitialized().catch(() => {});
  }, []);

  const refreshProfile = React.useCallback(async () => {
    if (!user?.email || !user?.uid) return;
    setAuthError(null);
    try {
      const a = await getAuthorizedUserByEmailOrUserDoc(user.email, user.uid);
      if (a) {
        setAuthorizedUser(a);
        const p = authorizedToProfile(a);
        setProfile(p);
        syncFromProfile({ nombre: a.nombre, apellido: "", matricula: a.matricula });
      } else {
        setAuthorizedUser(null);
        setProfile(null);
      }
    } catch (err) {
      if (isFirestoreOfflineError(err)) {
        // No cerrar sesión ni marcar no autorizado; Firestore puede reconectar en segundo plano
        console.warn("[Auth] Firestore offline en refreshProfile; se mantiene sesión.");
        return;
      }
      setAuthorizedUser(null);
      setProfile(null);
      setAuthError(AUTH_ERROR_VERIFY);
    }
  }, [user]);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(async (u) => {
      setUser(u);
      setAuthError(null);
      if (!u) {
        setProfile(null);
        setAuthorizedUser(null);
        clearOperadorId();
        setLoading(false);
        return;
      }
      const email = (u.email ?? "").trim().toLowerCase();
      const fallbackAuth: AuthorizedUser = {
        email: email || u.uid,
        rol: "PARAMEDICO",
        nombre: "Operador",
        matricula: "",
      };

      // Acceso inmediato: Auth dio el visto bueno → permitir entrada con fallback (no bloquear por Firestore).
      // Nunca se ejecuta signOut por error Firestore (unavailable/transport). signIn exitoso + sync 200 = acceso válido.
      setAuthorizedUser(fallbackAuth);
      setProfile(authorizedToProfile(fallbackAuth));
      syncFromProfile({ nombre: fallbackAuth.nombre, apellido: "", matricula: fallbackAuth.matricula });
      setLoading(false);

      // En segundo plano: sync con Neon y Firestore. signIn exitoso + sync 200 = entrada permitida.
      // Si Firestore devuelve unavailable / transport errored, no se cierra sesión; el usuario ya está dentro.
      (async () => {
        const syncResult = await syncUserToBackend(u.uid, u.email ?? "");
        if (syncResult.ok && syncResult.status === 200) {
          // Backend aceptó al usuario; el acceso ya está permitido arriba.
        }

        let resolved: AuthorizedUser = fallbackAuth;
        try {
          await ensureUserDocument(u.uid, u.email ?? "");
        } catch (e) {
          if (!isFirestoreOfflineError(e)) console.warn("[Firestore users] No se pudo crear documento:", e);
        }
        try {
          const a = email && u.uid ? await getAuthorizedUserByEmailOrUserDoc(email, u.uid) : null;
          if (a) resolved = a;
        } catch (e) {
          if (!isFirestoreOfflineError(e)) console.warn("[Firestore authorized_users] Lectura en segundo plano fallida:", e);
        }
        setAuthorizedUser(resolved);
        setProfile(authorizedToProfile(resolved));
        syncFromProfile({ nombre: resolved.nombre, apellido: "", matricula: resolved.matricula });
      })();
    });
    return unsub;
  }, []);

  // No bloquear entrada por Firestore: solo "no autorizado" si no hay user o aún loading (ya no dejamos authorizedUser null tras Auth).
  const isUnauthorized = Boolean(user && !authorizedUser && !loading);

  // Exponer en consola para crear el primer documento admin en Firestore (solo si sos ADMIN)
  React.useEffect(() => {
    if (authorizedUser?.rol === "ADMIN" && typeof window !== "undefined") {
      (window as Window & { crearPrimerAdminFirestore?: () => ReturnType<typeof crearPrimerAdminEnFirestore> }).crearPrimerAdminFirestore = crearPrimerAdminEnFirestore;
      return () => {
        delete (window as Window & { crearPrimerAdminFirestore?: unknown }).crearPrimerAdminFirestore;
      };
    }
  }, [authorizedUser?.rol]);

  const value = React.useMemo(
    () => ({ user, profile, authorizedUser, loading, isUnauthorized, authError, refreshProfile }),
    [user, profile, authorizedUser, loading, isUnauthorized, authError, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
