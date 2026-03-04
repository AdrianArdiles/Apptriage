"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getOperadorId, getUnidadId, clearOperadorId } from "@/lib/operador-storage";
import { clearFichaClinica } from "@/lib/ficha-clinica-storage";
import { removeIntervencionFromFirebase } from "@/lib/firebase-intervenciones";
import { validateManagerPin } from "@/lib/manager-auth";
import { setManagerSession, hasManagerSession } from "@/lib/manager-session";
import { LogoEkg } from "@/components/logo-ekg";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/lib/auth-context";
import { signOut, signInWithGoogle, GOOGLE_WEB_CLIENT_ID } from "@/lib/firebase-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BG_DARK = "#0f172a";
const RED_EMERGENCY = "#dc2626";
const BLUE_MEDICAL = "#2563eb";

/** Emails que acceden directamente al Dashboard de Gestión (opcional). Variable: NEXT_PUBLIC_MANAGER_EMAILS="a@b.com, c@d.com" */
const MANAGER_EMAILS =
  (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_MANAGER_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)) || [];

function LandingFallback(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
      <LogoEkg className="h-20 w-20 animate-pulse opacity-80" />
      <p className="mt-4 text-sm text-slate-400">Cargando…</p>
    </div>
  );
}

function LandingPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, authorizedUser, loading, isUnauthorized, authError: contextAuthError } = useAuth();
  const hasRedirected = React.useRef(false);

  // Si el usuario está logueado y autorizado → redirección a Nueva Atención (por defecto)
  React.useEffect(() => {
    if (!loading && isUnauthorized) {
      router.replace("/acceso-pendiente");
      return;
    }
    if (loading || !user || !profile || !authorizedUser) return;
    if (hasRedirected.current) return;
    const rol = authorizedUser.rol;
    const isManagerEmail = MANAGER_EMAILS.length > 0 && (user.email ?? "").trim().toLowerCase() && MANAGER_EMAILS.includes((user.email ?? "").trim().toLowerCase());
    const hasManager = hasManagerSession() || isManagerEmail || rol === "ADMIN" || rol === "DOCTOR";
    hasRedirected.current = true;
    if (hasManager) setManagerSession();
    if (searchParams.get("from") !== "nav") {
      router.replace("/atencion");
    }
  }, [loading, user, profile, authorizedUser, isUnauthorized, router, searchParams]);

  // Fallback: si tras login seguimos en "/", forzar redirección a Nueva Atención
  React.useEffect(() => {
    if (!user || !profile || !authorizedUser || loading) return;
    const t = setTimeout(() => {
      const rol = authorizedUser.rol;
      const hasManager = hasManagerSession() || rol === "ADMIN" || rol === "DOCTOR";
      if (hasManager) setManagerSession();
      router.replace("/atencion");
    }, 2500);
    return () => clearTimeout(t);
  }, [user, profile, authorizedUser, loading, router]);

  const [loginError, setLoginError] = React.useState("");
  const [authLoading, setAuthLoading] = React.useState(false);

  const [modalGestionOpen, setModalGestionOpen] = React.useState(false);
  const [pinGestion, setPinGestion] = React.useState("");
  const [pinError, setPinError] = React.useState(false);

  const accesoDenegado = searchParams.get("acceso") === "denegado";

  const handleGoogleSignIn = async () => {
    setLoginError("");
    setAuthLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
        if (typeof GoogleAuth.initialize === "function") {
          await GoogleAuth.initialize({ clientId: GOOGLE_WEB_CLIENT_ID } as Parameters<typeof GoogleAuth.initialize>[0]);
        }
      }
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : String(err);
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      const fullMsg = code ? `[${code}] ${msg}` : msg;
      setLoginError(fullMsg);
      if (typeof alert === "function") alert(fullMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleNuevaAtencion = () => {
    clearFichaClinica();
    removeIntervencionFromFirebase(getUnidadId() || getOperadorId() || "");
    router.push("/atencion?nueva=1");
  };

  const handleCerrarTurno = async () => {
    await signOut();
    clearOperadorId();
    clearFichaClinica();
  };

  const handleAccesoGestion = () => {
    setModalGestionOpen(true);
    setPinGestion("");
    setPinError(false);
  };

  const handleSubmitPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(false);
    if (validateManagerPin(pinGestion)) {
      setModalGestionOpen(false);
      setPinGestion("");
      setManagerSession();
      router.push("/manager");
    } else {
      setPinError(true);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
        <LogoEkg className="h-20 w-20 animate-pulse opacity-80" />
        <p className="mt-4 text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  // No autorizado: mensaje claro y botón (evita pantalla en blanco si falla la redirección)
  if (isUnauthorized && user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
        <div className="flex max-w-md flex-col items-center rounded-2xl border border-red-500/40 bg-slate-800/50 p-8 shadow-xl">
          <h1 className="mb-2 text-center text-xl font-bold text-red-200">Usuario no autorizado</h1>
          <p className="mb-6 text-center text-sm text-slate-400">
            Su correo no está en la lista de usuarios autorizados.
          </p>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace("/?acceso=denegado");
            }}
            className="min-h-[52px] w-full rounded-xl px-6 py-3 text-base font-semibold text-white transition disabled:opacity-60"
            style={{ backgroundColor: RED_EMERGENCY }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
        <header className="sticky top-0 z-30 flex flex-shrink-0 items-center justify-end border-b border-slate-800 px-4 py-3" style={{ borderColor: "rgba(51, 65, 85, 0.6)" }}>
          <button
            type="button"
            onClick={() => setModalGestionOpen(true)}
            className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            title="Acceso Gestión (Centro de Mando)"
            aria-label="Acceso Gestión"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </button>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mb-8 flex items-center justify-center">
            <LogoEkg className="h-28 w-28 drop-shadow-[0_0_24px_rgba(37,99,235,0.4)] animate-pulse [animation-duration:2s]" />
          </div>
          <h1 className="mb-2 text-center text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            AMBULANCIA PRO
          </h1>
          <p className="mb-2 text-center text-sm font-medium uppercase tracking-wide text-slate-400">
            Acceso Profesional
          </p>
          <p className="mb-10 text-center text-sm text-slate-500">
            Iniciá sesión con tu cuenta de Google autorizada
          </p>

          {accesoDenegado && (
            <p className="mb-4 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-center text-sm text-red-200">
              Usuario no autorizado. Su correo no está en la lista de usuarios autorizados.
            </p>
          )}
          {(contextAuthError || loginError) && (
            <p className="mb-4 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-center text-sm text-red-200">
              {contextAuthError || loginError}
            </p>
          )}
          <div className="w-full max-w-sm space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="flex w-full min-h-[56px] touch-manipulation items-center justify-center gap-3 rounded-xl border-2 border-slate-600 bg-white px-6 py-3 text-base font-semibold text-slate-800 transition active:scale-[0.98] hover:bg-slate-100 disabled:opacity-60 disabled:pointer-events-none"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google
            </button>
          </div>
        </main>
        <footer className="border-t border-slate-800 px-4 py-5 text-center" style={{ borderColor: "rgba(51, 65, 85, 0.6)" }}>
          <p className="text-xs text-slate-500">Sistema de Gestión de Emergencias V1.0</p>
        </footer>
        <Dialog open={modalGestionOpen} onOpenChange={setModalGestionOpen}>
          <DialogContent className="border-slate-700 bg-slate-900 text-slate-100" style={{ backgroundColor: "#1e293b" }}>
            <DialogHeader>
              <DialogTitle className="text-slate-100">Acceso Gestión</DialogTitle>
              <DialogDescription className="text-slate-400">
                Introduzca la clave de 4 dígitos para acceder al Centro de Mando.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitPin} className="space-y-4">
              <div>
                <label htmlFor="manager-pin-login" className="sr-only">Clave de 4 dígitos</label>
                <input
                  id="manager-pin-login"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinGestion}
                  onChange={(e) => {
                    setPinGestion(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setPinError(false);
                  }}
                  placeholder="••••"
                  className="w-full rounded-xl border-2 border-slate-600 bg-slate-800 px-4 py-3 text-center text-lg tracking-[0.5em] text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  autoComplete="off"
                />
                {pinError && <p className="mt-2 text-center text-sm text-red-400">Clave incorrecta</p>}
              </div>
              <button type="submit" className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-900" style={{ backgroundColor: "#eab308" }}>
                Entrar
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (user && profile) {
    const fromNav = searchParams.get("from") === "nav";
    if (!fromNav) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
          <LogoEkg className="h-20 w-20 animate-pulse opacity-80" />
          <p className="mt-4 text-sm text-slate-400">Entrando al triaje…</p>
        </div>
      );
    }
  }

  if (user && !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
        <LogoEkg className="h-20 w-20 animate-pulse opacity-80" />
        <p className="mt-4 text-sm text-slate-400">Comprobando autorización…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-6 flex items-center justify-center">
          <LogoEkg className="h-28 w-28 drop-shadow-[0_0_24px_rgba(37,99,235,0.4)]" />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          AMBULANCIA PRO
        </h1>
        <p className="mb-10 text-sm text-slate-400">Atención prehospitalaria</p>

        <div className="w-full max-w-sm space-y-6 text-center">
          <p className="text-sm text-slate-400">
            Paramédico: <span className="font-medium text-slate-200">{getOperadorId() || "—"}</span>
            {getUnidadId() && (
              <> · Matrícula: <span className="font-medium text-slate-200">{getUnidadId()}</span></>
            )}
          </p>
          <button
            type="button"
            onClick={handleNuevaAtencion}
            className="relative w-full min-h-[56px] touch-manipulation rounded-xl px-6 py-4 text-lg font-bold text-white transition active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${RED_EMERGENCY} 0%, ${BLUE_MEDICAL} 100%)`,
              boxShadow: "0 0 20px rgba(37, 99, 235, 0.4), 0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            NUEVA ATENCIÓN
          </button>
          <Link
            href="/historial"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-blue-500/50 hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            Ver últimos PDF
          </Link>
          <button
            type="button"
            onClick={handleAccesoGestion}
            className="inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl border-2 border-amber-500/60 bg-slate-800/80 px-4 py-3 text-sm font-medium text-amber-200 transition hover:border-amber-400 hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Sistema de Gestión
          </button>
          <button
            type="button"
            onClick={handleCerrarTurno}
            className="text-sm text-slate-500 hover:text-slate-400 underline"
          >
            Cerrar sesión
          </button>
        </div>
      </main>

      <footer className="flex flex-col items-center gap-2 border-t border-slate-800 px-4 py-5 text-center" style={{ borderColor: "rgba(51, 65, 85, 0.6)" }}>
        <LogoEkg className="h-10 w-10 opacity-80" />
        <p className="text-xs text-slate-500">Sistema de Gestión de Emergencias V1.0</p>
        <button type="button" onClick={handleAccesoGestion} className="mt-1 text-xs text-slate-600 hover:text-slate-400 underline">
          Acceso Gestión
        </button>
      </footer>

      <Dialog open={modalGestionOpen} onOpenChange={setModalGestionOpen}>
        <DialogContent className="border-slate-700 bg-slate-900 text-slate-100" style={{ backgroundColor: "#1e293b" }}>
          <DialogHeader>
            <DialogTitle className="text-slate-100">Acceso Gestión</DialogTitle>
            <DialogDescription className="text-slate-400">
              Introduzca la clave de 4 dígitos para acceder al Centro de Mando.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitPin} className="space-y-4">
            <div>
              <label htmlFor="manager-pin" className="sr-only">Clave de 4 dígitos</label>
              <input
                id="manager-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinGestion}
                onChange={(e) => {
                  setPinGestion(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setPinError(false);
                }}
                placeholder="••••"
                className="w-full rounded-xl border-2 border-slate-600 bg-slate-800 px-4 py-3 text-center text-lg tracking-[0.5em] text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                autoComplete="off"
              />
              {pinError && <p className="mt-2 text-center text-sm text-red-400">Clave incorrecta</p>}
            </div>
            <button type="submit" className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-900" style={{ backgroundColor: "#eab308" }}>
              Entrar
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page(): React.ReactElement {
  return (
    <React.Suspense fallback={<LandingFallback />}>
      <LandingPage />
    </React.Suspense>
  );
}
