"use client";

import * as React from "react";
import Link from "next/link";
import { ChecklistXABCDE, type DatosEvaluacionInicial } from "@/components/checklist-xabcde";
import { TriageResult } from "@/components/triage-result";
import { ModalConfirmacionIngreso } from "@/components/modal-confirmacion-ingreso";
import { SpinnerMedico } from "@/components/spinner-medico";
import { postTriage, type PayloadTriage } from "@/lib/api";
import type { RegistroTriage } from "@/lib/types";

/** Construye el payload para la API (Ficha clínica digital: blood_loss, airway_status, pulse, bp_*, glasgow_score, etc.). */
function toPayloadTriage(data: DatosEvaluacionInicial): PayloadTriage {
  const payload: PayloadTriage = {
    paciente_id: data.paciente_id,
    sintomas_texto: data.sintomas_texto,
  };
  if (data.hora_inicio_atencion) payload.hora_inicio_atencion = data.hora_inicio_atencion;
  const nombre = data.nombre_paciente?.trim();
  const dni = data.dni?.trim();
  payload.nombre_paciente = nombre || "Paciente sin identificar";
  if (dni) payload.dni = dni;
  if (data.signos_vitales && Object.keys(data.signos_vitales).length > 0) {
    payload.signos_vitales = data.signos_vitales as Record<string, unknown>;
  }
  if (data.glasgow) payload.glasgow = data.glasgow;
  if (data.glasgow_score != null) payload.glasgow_score = data.glasgow_score;
  if (data.blood_loss != null) payload.blood_loss = data.blood_loss;
  if (data.airway_status != null) payload.airway_status = data.airway_status;
  if (data.respiration_rate != null) payload.respiration_rate = data.respiration_rate;
  if (data.pulse != null) payload.pulse = data.pulse;
  if (data.bp_systolic != null) payload.bp_systolic = data.bp_systolic;
  if (data.bp_diastolic != null) payload.bp_diastolic = data.bp_diastolic;
  return payload;
}

export default function TriagePage(): React.ReactElement {
  const [resultado, setResultado] = React.useState<RegistroTriage | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [respuestaPendienteConfirmacion, setRespuestaPendienteConfirmacion] =
    React.useState<RegistroTriage | null>(null);
  const [modalConfirmacionOpen, setModalConfirmacionOpen] = React.useState(false);
  const [buildId, setBuildId] = React.useState<string>("");

  React.useEffect(() => {
    setBuildId(new Date().toLocaleString("es-ES", { dateStyle: "short", timeStyle: "medium" }));
  }, []);

  const handleSubmit = React.useCallback(async (data: DatosEvaluacionInicial) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = toPayloadTriage(data);
      console.log("Datos reales a enviar:", JSON.stringify(formData));
      const { status, data: resData } = await postTriage(formData);
      if (status >= 200 && status < 300) {
        const payload = resData as { success?: boolean; id?: unknown; registro?: RegistroTriage };
        setResultado(payload.registro ?? (resData as RegistroTriage));
      } else {
        const errMsg = typeof resData === "object" && resData !== null && "error" in resData
          ? String((resData as { error: unknown }).error)
          : `Error ${status}`;
        const recibido = typeof resData === "object" && resData !== null && "recibido" in resData
          ? JSON.stringify((resData as { recibido: unknown }).recibido, null, 2)
          : "";
        setError(recibido ? `${errMsg}\n\nRecibido:\n${recibido}` : errMsg);
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
    <div className="min-h-screen bg-zinc-900 font-sans text-zinc-100">
      <header className="border-b border-zinc-700 bg-zinc-800/90">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-6 md:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
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
              <h1 className="text-xl font-semibold text-zinc-100">Ficha Clínica Digital</h1>
              <p className="text-sm text-zinc-400">Ambulancias — XABCDE · Glasgow · Timestamps</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/historial" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:underline active:opacity-80">
              Historial
            </Link>
            <Link href="/dashboard">
              <span className="inline-flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-md border border-zinc-600 bg-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-600 active:opacity-80">Dashboard</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 md:px-8">
        <p className="mb-4 text-xs text-zinc-500">Dark mode — datos guardados en este dispositivo</p>
        {error && (
          <div
            role="alert"
            className="mb-8 rounded-xl border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-200"
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
                className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm"
                aria-live="polite"
              >
                <SpinnerMedico label="Enviando reporte a central…" />
              </div>
            )}
            <ChecklistXABCDE onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        )}

        <ModalConfirmacionIngreso
          open={modalConfirmacionOpen}
          onOpenChange={setModalConfirmacionOpen}
          registro={respuestaPendienteConfirmacion}
          onConfirmar={handleConfirmarIngreso}
        />
      </main>

      <footer className="mt-16 border-t border-zinc-800 bg-zinc-800/50 px-4 py-6 text-center text-sm text-zinc-500 sm:px-6">
        <p>Ficha clínica para uso en ambulancia. Los datos se guardan localmente hasta enviar.</p>
        <p className="mt-2 text-xs text-zinc-600">Build: {buildId || "…"}</p>
      </footer>
    </div>
  );
}
