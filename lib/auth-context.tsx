"use client";

import * as React from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, getUserProfile, type UserProfile } from "@/lib/firebase-auth";
import { syncFromProfile, clearOperadorId } from "@/lib/operador-storage";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      profile: null,
      loading: true,
      refreshProfile: async () => {},
    };
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshProfile = React.useCallback(async () => {
    if (!user) return;
    try {
      const p = await getUserProfile(user.uid);
      setProfile(p);
      if (p) syncFromProfile(p);
    } catch {
      setProfile(null);
    }
  }, [user]);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        clearOperadorId();
        setLoading(false);
        return;
      }
      try {
        const p = await getUserProfile(u.uid);
        setProfile(p);
        if (p) syncFromProfile(p);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const value = React.useMemo(
    () => ({ user, profile, loading, refreshProfile }),
    [user, profile, loading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
