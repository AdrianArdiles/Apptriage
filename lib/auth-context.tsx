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
/** Si la verificación tarda más (red lenta en móvil), permitir acceso como PARAMEDICO para no dejar pantalla en blanco. */
const AUTH_VERIFY_TIMEOUT_MS = 18000;

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
    } catch {
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

      // Sincronizar usuario con Neon (upsert: crear o actualizar lastLogin)
      syncUserToBackend(u.uid, u.email ?? "").catch(() => {});

      const verify = async (): Promise<AuthorizedUser | null> => {
        try {
          await ensureUserDocument(u.uid, u.email ?? "");
        } catch (e) {
          console.warn("[Firestore users] No se pudo crear documento de usuario:", e);
        }
        return email && u.uid ? await getAuthorizedUserByEmailOrUserDoc(email, u.uid) : null;
      };

      const timeoutPromise = new Promise<AuthorizedUser>((resolve) => {
        setTimeout(() => resolve(fallbackAuth), AUTH_VERIFY_TIMEOUT_MS);
      });

      try {
        const a = await Promise.race([verify(), timeoutPromise]);
        const resolved = a ?? fallbackAuth;
        setAuthorizedUser(resolved);
        const p = authorizedToProfile(resolved);
        setProfile(p);
        syncFromProfile({ nombre: resolved.nombre, apellido: "", matricula: resolved.matricula });
        if (a === null && email && u.uid) {
          setAuthError(null);
        }
      } catch {
        setAuthorizedUser(fallbackAuth);
        setProfile(authorizedToProfile(fallbackAuth));
        syncFromProfile({ nombre: "Operador", apellido: "", matricula: "" });
        setAuthError(AUTH_ERROR_VERIFY);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

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
