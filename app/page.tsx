"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getOperadorId, getUnidadId, clearOperadorId, syncFromProfile } from "@/lib/operador-storage";
import { clearFichaClinica } from "@/lib/ficha-clinica-storage";
import { removeIntervencionFromFirebase } from "@/lib/firebase-intervenciones";
import { validateManagerPin } from "@/lib/manager-auth";
import { setManagerSession } from "@/lib/manager-session";
import { LogoEkg } from "@/components/logo-ekg";
import { useAuth } from "@/lib/auth-context";
import { signIn, signUp, signOut, setUserProfile } from "@/lib/firebase-auth";
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
  const { user, profile, loading, refreshProfile } = useAuth();
  const hasRedirected = React.useRef(false);

  React.useEffect(() => {
    if (loading || !user || !profile) return;
    if (searchParams.get("from") === "nav") return;
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    const email = (user.email ?? "").trim().toLowerCase();
    if (MANAGER_EMAILS.length > 0 && email && MANAGER_EMAILS.includes(email)) {
      setManagerSession();
      router.replace("/manager");
    } else {
      router.replace("/atencion");
    }
  }, [loading, user, profile, router, searchParams]);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [authError, setAuthError] = React.useState("");
  const [authLoading, setAuthLoading] = React.useState(false);
  const [isRegister, setIsRegister] = React.useState(false);

  const [nombre, setNombre] = React.useState("");
  const [apellido, setApellido] = React.useState("");
  const [matricula, setMatricula] = React.useState("");
  const [profileError, setProfileError] = React.useState("");
  const [profileLoading, setProfileLoading] = React.useState(false);

  const [modalGestionOpen, setModalGestionOpen] = React.useState(false);
  const [pinGestion, setPinGestion] = React.useState("");
  const [pinError, setPinError] = React.useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (isRegister) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Error al iniciar sesión";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!nombre.trim() || !apellido.trim() || !matricula.trim()) {
      setProfileError("Complete todos los campos.");
      return;
    }
    setProfileError("");
    setProfileLoading(true);
    try {
      await setUserProfile(user.uid, {
        email: user.email ?? "",
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        matricula: matricula.trim(),
      });
      syncFromProfile({ nombre: nombre.trim(), apellido: apellido.trim(), matricula: matricula.trim() });
      await refreshProfile();
    } catch {
      setProfileError("No se pudo guardar el perfil. Intente de nuevo.");
    } finally {
      setProfileLoading(false);
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
          <div className="mb-6 flex items-center justify-center">
            <LogoEkg className="h-28 w-28 drop-shadow-[0_0_24px_rgba(37,99,235,0.4)]" />
          </div>
          <h1 className="mb-2 text-center text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            AMBULANCIA PRO
          </h1>
          <p className="mb-10 text-sm text-slate-400">Acceso profesional</p>

          <form onSubmit={handleAuthSubmit} className="w-full max-w-sm space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setAuthError(""); }}
                placeholder="correo@ejemplo.com"
                className="w-full min-h-[52px] rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                placeholder="••••••••"
                className="w-full min-h-[52px] rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
              />
            </div>
            {authError && (
              <p className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-200">
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="relative w-full min-h-[58px] touch-manipulation rounded-xl px-6 py-4 text-lg font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${RED_EMERGENCY} 0%, ${BLUE_MEDICAL} 100%)`,
                boxShadow: "0 0 24px rgba(37, 99, 235, 0.5), 0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              {authLoading ? "Espere…" : isRegister ? "REGISTRARSE" : "INICIAR SESIÓN"}
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setAuthError(""); }}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-300 underline"
            >
              {isRegister ? "Ya tengo cuenta" : "Crear cuenta nueva"}
            </button>
          </form>
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

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mb-6 flex items-center justify-center">
            <LogoEkg className="h-24 w-24 drop-shadow-[0_0_24px_rgba(37,99,235,0.4)]" />
          </div>
          <h1 className="mb-2 text-center text-xl font-bold text-slate-100">Completar perfil profesional</h1>
          <p className="mb-8 text-sm text-slate-400">Primera vez: indique nombre, apellido y matrícula.</p>

          <form onSubmit={handleProfileSubmit} className="w-full max-w-sm space-y-5">
            <div>
              <label htmlFor="nombre" className="mb-2 block text-sm font-medium text-slate-300">Nombre</label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan"
                className="w-full min-h-[52px] rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>
            <div>
              <label htmlFor="apellido" className="mb-2 block text-sm font-medium text-slate-300">Apellido</label>
              <input
                id="apellido"
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ej: García"
                className="w-full min-h-[52px] rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>
            <div>
              <label htmlFor="matricula" className="mb-2 block text-sm font-medium text-slate-300">Número de Matrícula</label>
              <input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ej: M-042"
                className="w-full min-h-[52px] rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>
            {profileError && (
              <p className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-200">{profileError}</p>
            )}
            <button
              type="submit"
              disabled={profileLoading}
              className="w-full min-h-[58px] rounded-xl px-6 py-4 text-lg font-bold text-white transition disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${RED_EMERGENCY} 0%, ${BLUE_MEDICAL} 100%)`,
                boxShadow: "0 0 24px rgba(37, 99, 235, 0.5), 0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              {profileLoading ? "Guardando…" : "GUARDAR Y CONTINUAR"}
            </button>
          </form>
        </main>
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
