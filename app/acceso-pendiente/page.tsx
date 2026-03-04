"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/firebase-auth";
import { LogoEkg } from "@/components/logo-ekg";

const BG_DARK = "#0f172a";
const RED_EMERGENCY = "#dc2626";

export default function AccesoPendientePage(): React.ReactElement {
  const router = useRouter();
  const { user, isUnauthorized, loading } = useAuth();
  const [signingOut, setSigningOut] = React.useState(false);
  const hasSignedOut = React.useRef(false);

  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!isUnauthorized) {
      router.replace("/");
      return;
    }
    if (!hasSignedOut.current) {
      hasSignedOut.current = true;
      signOut().then(() => router.replace("/?acceso=denegado"));
    }
  }, [user, isUnauthorized, loading, router]);

  const handleVolver = () => {
    setSigningOut(true);
    signOut().then(() => router.replace("/")).finally(() => setSigningOut(false));
  };

  if (loading || !user || !isUnauthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
        <LogoEkg className="h-20 w-20 animate-pulse opacity-80" />
        <p className="mt-4 text-sm text-slate-400">Comprobando acceso…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
      <div className="flex max-w-md flex-col items-center rounded-2xl border border-red-500/40 bg-slate-800/50 p-8 shadow-xl">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500/60 bg-red-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="mb-2 text-center text-xl font-bold text-red-200">
          Usuario no autorizado
        </h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          Su correo no está en la lista de usuarios autorizados. La sesión se ha cerrado.
        </p>
        <button
          type="button"
          onClick={handleVolver}
          disabled={signingOut}
          className="min-h-[52px] w-full rounded-xl px-6 py-3 text-base font-semibold text-white transition disabled:opacity-60"
          style={{ backgroundColor: RED_EMERGENCY }}
        >
          {signingOut ? "Saliendo…" : "Volver al inicio"}
        </button>
      </div>
    </div>
  );
}
