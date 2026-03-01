"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOperadorId, setOperadorId, getUnidadId, setUnidadId, clearOperadorId } from "@/lib/operador-storage";
import { clearFichaClinica } from "@/lib/ficha-clinica-storage";
import { validateManagerPin } from "@/lib/manager-auth";
import { LogoEkg } from "@/components/logo-ekg";
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

export default function LandingPage(): React.ReactElement {
  const router = useRouter();
  const [idParamedico, setIdParamedico] = React.useState("");
  const [idUnidad, setIdUnidad] = React.useState("");
  const [guardStarted, setGuardStarted] = React.useState(false);
  const [modalGestionOpen, setModalGestionOpen] = React.useState(false);
  const [pinGestion, setPinGestion] = React.useState("");
  const [pinError, setPinError] = React.useState(false);

  React.useEffect(() => {
    const id = getOperadorId();
    const unidad = getUnidadId();
    if (id) {
      setGuardStarted(true);
      setIdParamedico(id);
      setIdUnidad(unidad);
    }
  }, []);

  const handleIniciarTurno = (e: React.FormEvent) => {
    e.preventDefault();
    const id = idParamedico.trim();
    const unidad = idUnidad.trim();
    if (!id) return;
    setOperadorId(id);
    setUnidadId(unidad);
    setGuardStarted(true);
    clearFichaClinica();
    router.push("/atencion?nueva=1");
  };

  const handleNuevaAtencion = () => {
    clearFichaClinica();
    router.push("/atencion?nueva=1");
  };

  const handleCerrarGuardia = () => {
    clearOperadorId();
    setIdParamedico("");
    setIdUnidad("");
    setGuardStarted(false);
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
      router.push("/manager");
    } else {
      setPinError(true);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col font-sans text-slate-100"
      style={{ backgroundColor: BG_DARK }}
    >
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Logo con degradado rojo-azul */}
        <div className="mb-6 flex items-center justify-center">
          <LogoEkg className="h-28 w-28 drop-shadow-[0_0_24px_rgba(37,99,235,0.4)]" />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          AMBULANCIA PRO
        </h1>
        <p className="mb-10 text-sm text-slate-400">Atención prehospitalaria</p>

        {!guardStarted ? (
          <form onSubmit={handleIniciarTurno} className="w-full max-w-sm space-y-5">
            <div>
              <label htmlFor="id-paramedico" className="mb-2 block text-sm font-medium text-slate-300">
                ID del Paramédico
              </label>
              <input
                id="id-paramedico"
                type="text"
                value={idParamedico}
                onChange={(e) => setIdParamedico(e.target.value)}
                placeholder="Ej: M-042"
                className="w-full min-h-[52px] rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="id-unidad" className="mb-2 block text-sm font-medium text-slate-300">
                N° de Unidad / Móvil
              </label>
              <input
                id="id-unidad"
                type="text"
                value={idUnidad}
                onChange={(e) => setIdUnidad(e.target.value)}
                placeholder="Ej: U-12 / 600 123 456"
                className="w-full min-h-[52px] rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={!idParamedico.trim()}
              className="relative w-full min-h-[58px] touch-manipulation rounded-xl px-6 py-4 text-lg font-bold text-white transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${RED_EMERGENCY} 0%, ${BLUE_MEDICAL} 100%)`,
                boxShadow: "0 0 24px rgba(37, 99, 235, 0.5), 0 0 48px rgba(220, 38, 38, 0.25), 0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              INICIAR TURNO
            </button>
          </form>
        ) : (
          <div className="w-full max-w-sm space-y-6 text-center">
            <p className="text-sm text-slate-400">
              Paramédico: <span className="font-medium text-slate-200">{getOperadorId() || "—"}</span>
              {getUnidadId() && (
                <> · Unidad: <span className="font-medium text-slate-200">{getUnidadId()}</span></>
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
              onClick={handleCerrarGuardia}
              className="text-sm text-slate-500 hover:text-slate-400 underline"
            >
              Cerrar turno
            </button>
          </div>
        )}
      </main>

      <footer
        className="flex flex-col items-center gap-2 border-t border-slate-800 px-4 py-5 text-center"
        style={{ borderColor: "rgba(51, 65, 85, 0.6)" }}
      >
        <LogoEkg className="h-10 w-10 opacity-80" />
        <p className="text-xs text-slate-500">Sistema de Gestión de Emergencias V1.0</p>
        <button
          type="button"
          onClick={handleAccesoGestion}
          className="mt-1 text-xs text-slate-600 hover:text-slate-400 underline"
        >
          Acceso Gestión
        </button>
      </footer>

      <Dialog open={modalGestionOpen} onOpenChange={setModalGestionOpen}>
        <DialogContent
          className="border-slate-700 bg-slate-900 text-slate-100"
          style={{ backgroundColor: "#1e293b" }}
        >
          <DialogHeader>
            <DialogTitle className="text-slate-100">Acceso Gestión</DialogTitle>
            <DialogDescription className="text-slate-400">
              Introduzca la clave de 4 dígitos para acceder al Centro de Mando.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitPin} className="space-y-4">
            <div>
              <label htmlFor="manager-pin" className="sr-only">
                Clave de 4 dígitos
              </label>
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
              {pinError && (
                <p className="mt-2 text-center text-sm text-red-400">Clave incorrecta</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-900"
              style={{ backgroundColor: "#eab308" }}
            >
              Entrar
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
