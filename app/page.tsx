"use client";

import * as React from "react";
import Link from "next/link";
import { TriageForm } from "@/components/triage-form";
import { TriageResult } from "@/components/triage-result";
import { ModalConfirmacionIngreso } from "@/components/modal-confirmacion-ingreso";
import { SpinnerMedico } from "@/components/spinner-medico";
import { postTriage, type PayloadTriage } from "@/lib/api";
import type { FormularioEntrada } from "@/components/triage-form";
import type { RegistroTriage } from "@/lib/types";

/** Construye un objeto limpio con solo las propiedades que espera el backend (paciente_id, sintomas_texto, etc.). */
function toPayloadTriage(data: FormularioEntrada): PayloadTriage {
  const payload: PayloadTriage = {
    paciente_id: data.paciente_id,
    sintomas_texto: data.sintomas_texto,
  };
  if (data.nombre_paciente?.trim()) payload.nombre_paciente = data.nombre_paciente.trim();
  if (data.dni?.trim()) payload.dni = data.dni.trim();
  if (data.signos_vitales && Object.keys(data.signos_vitales).length > 0) {
    payload.signos_vitales = data.signos_vitales as Record<string, unknown>;
  }
  if (data.glasgow) payload.glasgow = data.glasgow;
  return payload;
}

export default function TriagePage(): React.ReactElement {
  const [resultado, setResultado] = React.useState<RegistroTriage | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [respuestaPendienteConfirmacion, setRespuestaPendienteConfirmacion] =
    React.useState<RegistroTriage | null>(null);
  const [modalConfirmacionOpen, setModalConfirmacionOpen] = React.useState(false);

  const handleSubmit = React.useCallback(async (data: FormularioEntrada) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const datos = toPayloadTriage(data);
      const { status, data: resData } = await postTriage(datos);
      if (status >= 200 && status < 300) {
        setResultado(resData as RegistroTriage);
      } else {
        const errMsg = typeof resData === "object" && resData !== null && "error" in resData
          ? String((resData as { error: unknown }).error)
          : `Error ${status}`;
        setError(errMsg);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleConfirmarIngreso = React.useCallback(() => {
    if (respuestaPendienteConfirmacion) {
      setResultado(respuestaPendienteConfirmacion);
      setRespuestaPendienteConfirmacion(null);
    }
    setModalConfirmacionOpen(false);
  }, [respuestaPendienteConfirmacion]);

  const handleNuevoTriage = React.useCallback(() => {
    setResultado(null);
    setError(null);
    setRespuestaPendienteConfirmacion(null);
    setModalConfirmacionOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-6 md:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--medical-slate-blue)] text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Triage Médico</h1>
              <p className="text-sm text-slate-500">Evaluación de síntomas — Herramienta de apoyo</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/historial" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline active:opacity-80">
              Historial de Ingresos
            </Link>
            <Link href="/dashboard">
              <span className="inline-flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 active:opacity-80">Dashboard</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 md:px-8">
        <p className="mb-4 text-xs text-slate-400">VERSIÓN: DEBUG-001</p>
        {error && (
          <div
            role="alert"
            className="mb-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {resultado ? (
          <TriageResult registro={resultado} onNuevoTriage={handleNuevoTriage} />
        ) : (
          <div className="relative">
            {isSubmitting && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm"
                aria-live="polite"
              >
                <SpinnerMedico label="La IA está procesando el triaje…" />
              </div>
            )}
            <TriageForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        )}

        <ModalConfirmacionIngreso
          open={modalConfirmacionOpen}
          onOpenChange={setModalConfirmacionOpen}
          registro={respuestaPendienteConfirmacion}
          onConfirmar={handleConfirmarIngreso}
        />
      </main>

      <footer className="mt-16 border-t border-slate-100 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500 sm:px-6">
        Cumplimiento HIPAA simulado con fines educativos. No sustituye una evaluación legal.
      </footer>
    </div>
  );
}
