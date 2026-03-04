"use client";

import * as React from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, type UserProfile } from "@/lib/firebase-auth";
import { getAuthorizedUserByEmail, type AuthorizedUser } from "@/lib/authorized-users";
import { syncFromProfile, clearOperadorId } from "@/lib/operador-storage";
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

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [authorizedUser, setAuthorizedUser] = React.useState<AuthorizedUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const refreshProfile = React.useCallback(async () => {
    if (!user?.email) return;
    setAuthError(null);
    try {
      const a = await getAuthorizedUserByEmail(user.email);
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
      try {
        const email = (u.email ?? "").trim().toLowerCase();
        // Después del login: buscar al usuario en la colección authorized_users (Firestore)
        const a = email ? await getAuthorizedUserByEmail(email) : null;
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
