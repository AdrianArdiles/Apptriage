"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChecklistXABCDE, type DatosEvaluacionInicial } from "@/components/checklist-xabcde";
import { LogoEkg } from "@/components/logo-ekg";
import { TriageResult } from "@/components/triage-result";
import { ModalConfirmacionIngreso } from "@/components/modal-confirmacion-ingreso";
import { SpinnerMedico } from "@/components/spinner-medico";
import { postTriage, type PayloadTriage } from "@/lib/api";
import { addReportToQueue, getReportQueue, processReportQueue } from "@/lib/report-queue";
import { clearFichaClinica } from "@/lib/ficha-clinica-storage";
import { getOperadorId, getUnidadId } from "@/lib/operador-storage";
import { hapticCancelWarning } from "@/lib/haptics";
import { removeIntervencionFromFirebase } from "@/lib/firebase-intervenciones";
import {
  subscribeMensajes,
  markAsRead,
  type MensajePayload,
} from "@/lib/firebase-mensajes";
import { playNotificationSound } from "@/lib/notification-sound";
import type { RegistroTriage } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BG_DARK = "#0f172a";
const CARD_BG = "#1e293b";
const BLUE_MEDICAL = "#2563eb";
const RED_EMERGENCY = "#dc2626";
const ORANGE_WARNING = "#ea580c";
const ORANGE_BG = "rgba(234, 88, 12, 0.95)";

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

function AtencionContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resultado, setResultado] = React.useState<RegistroTriage | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [respuestaPendienteConfirmacion, setRespuestaPendienteConfirmacion] =
    React.useState<RegistroTriage | null>(null);
  const [modalConfirmacionOpen, setModalConfirmacionOpen] = React.useState(false);
  const [modalCancelarOpen, setModalCancelarOpen] = React.useState(false);
  const [buildId, setBuildId] = React.useState<string>("");
  const [queueMessage, setQueueMessage] = React.useState<string | null>(null);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  const [mensajeManager, setMensajeManager] = React.useState<MensajePayload | null>(null);
  const [movilId, setMovilId] = React.useState("");
  const lastSentAtRef = React.useRef<string | null>(null);

  const refreshPendingCount = React.useCallback(() => setPendingCount(getReportQueue().length), []);

  React.useEffect(() => {
    if (mounted) setMovilId(getUnidadId() || getOperadorId() || "");
  }, [mounted]);

  React.useEffect(() => {
    if (!movilId.trim()) return;
    const unsub = subscribeMensajes(movilId, (data) => {
      setMensajeManager(data);
      if (data?.text && data.sentAt !== lastSentAtRef.current) {
        lastSentAtRef.current = data.sentAt;
        playNotificationSound();
      }
      if (!data) lastSentAtRef.current = null;
    });
    return unsub;
  }, [movilId]);

  const handleMensajeRecibido = React.useCallback(() => {
    if (movilId.trim()) markAsRead(movilId);
    setMensajeManager(null);
  }, [movilId]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (searchParams.get("nueva") === "1") clearFichaClinica();
  }, [searchParams]);

  React.useEffect(() => {
    refreshPendingCount();
  }, [queueMessage, resultado, refreshPendingCount]);

  React.useEffect(() => {
    setBuildId(new Date().toLocaleString("es-ES", { dateStyle: "short", timeStyle: "medium" }));
  }, []);

  React.useEffect(() => {
    const process = () => {
      processReportQueue((count) => {
        setQueueMessage(`Se han enviado ${count} reporte(s) desde Pendientes.`);
        setPendingCount(getReportQueue().length);
        setTimeout(() => setQueueMessage(null), 5000);
      });
    };
    if (typeof window !== "undefined" && navigator.onLine) process();
    window.addEventListener("online", process);
    return () => window.removeEventListener("online", process);
  }, []);

  const handleSubmit = React.useCallback(async (data: DatosEvaluacionInicial) => {
    setError(null);
    setQueueMessage(null);
    setIsSubmitting(true);
    const formData = toPayloadTriage(data);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addReportToQueue(formData);
        setQueueMessage("Sin conexión. El reporte se ha guardado en Pendientes y se enviará automáticamente cuando haya internet.");
        setPendingCount(getReportQueue().length);
        setIsSubmitting(false);
        return;
      }
      const { status, data: resData } = await postTriage(formData);
      if (status >= 200 && status < 300) {
        removeIntervencionFromFirebase(getUnidadId() || getOperadorId() || "");
        const payload = resData as { success?: boolean; registro?: RegistroTriage };
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
      const isOffline = e instanceof Error && (e.message === "SIN_CONEXION" || (e as Error & { code?: string }).code === "SIN_CONEXION");
      if (isOffline) {
        addReportToQueue(formData);
        setQueueMessage("Sin conexión. El reporte se ha guardado en Pendientes y se enviará automáticamente cuando haya internet.");
        setPendingCount(getReportQueue().length);
      } else {
        setError(String(e));
      }
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

  const handleConfirmarCancelar = React.useCallback(() => {
    clearFichaClinica();
    hapticCancelWarning();
    setModalCancelarOpen(false);
    router.push("/");
  }, [router]);

  return (
    <div
      className={`min-h-screen font-sans text-slate-100 transition-all duration-300 ${
        mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ backgroundColor: BG_DARK }}
    >
      {/* Sticky header táctico: logo EKG + Paramédico / Móvil */}
      <header
        className="sticky top-0 z-40 border-b px-4 py-3 shadow-sm"
        style={{ backgroundColor: CARD_BG, borderColor: "rgba(37, 99, 235, 0.3)" }}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: BG_DARK }}>
              <LogoEkg className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-200">
                {getOperadorId() || "—"} {getUnidadId() && <span className="text-slate-400">· {getUnidadId()}</span>}
              </p>
              <p className="text-xs text-slate-500">Ficha Clínica · XABCDE</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/" className="text-sm font-medium text-slate-400 hover:text-slate-100">Inicio</Link>
            <Link href="/historial" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sm font-medium text-slate-300 hover:text-slate-100 hover:underline active:opacity-80">
              Historial
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:opacity-90"
              style={{ borderColor: "rgba(37, 99, 235, 0.5)", backgroundColor: "rgba(15, 23, 42, 0.8)" }}
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Banner estilo radio: mensaje del Manager */}
      {mensajeManager?.text && !mensajeManager?.leido && (
        <div
          role="alert"
          className="sticky top-0 z-50 mx-auto w-full max-w-3xl px-4 pt-2 sm:px-6"
        >
          <div
            className="flex flex-wrap items-center gap-3 rounded border-4 border-black bg-zinc-900 px-4 py-3 shadow-lg"
            style={{
              backgroundColor: "rgba(15, 15, 15, 0.98)",
              borderColor: "#0a0a0a",
              boxShadow: "inset 0 0 0 1px #404040, 0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            <p
              className="min-w-0 flex-1 font-mono text-sm tracking-wider text-amber-400"
              style={{ textShadow: "0 0 8px rgba(251, 191, 36, 0.4)" }}
            >
              <span className="text-amber-500">▶ CENTRO: </span>
              {mensajeManager.text}
            </p>
            <button
              type="button"
              onClick={handleMensajeRecibido}
              className="shrink-0 rounded border-2 border-amber-500 bg-amber-500/20 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-amber-400 transition hover:bg-amber-500/30 active:scale-[0.98]"
            >
              OK / RECIBIDO
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        {!resultado && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setModalCancelarOpen(true)}
              className="min-h-[44px] rounded-xl border-2 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
              style={{ borderColor: RED_EMERGENCY }}
              aria-label="Cancelar atención actual"
            >
              CANCELAR ATENCIÓN
            </button>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-8 rounded-xl border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {queueMessage && (
          <div role="status" className="mb-8 rounded-xl border border-emerald-700 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
            {queueMessage}
          </div>
        )}
        {pendingCount > 0 && !queueMessage && (
          <div role="status" className="mb-6 rounded-xl border border-amber-700 bg-amber-900/30 px-4 py-2 text-sm text-amber-200">
            Tienes {pendingCount} reporte(s) en Pendientes. Se enviarán cuando haya conexión.
          </div>
        )}

        {resultado ? (
          <TriageResult registro={resultado} onNuevoTriage={handleNuevoTriage} />
        ) : (
          <div className="relative">
            {isSubmitting && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border backdrop-blur-sm" style={{ borderColor: "rgba(37, 99, 235, 0.3)", backgroundColor: "rgba(15, 23, 42, 0.95)" }} aria-live="polite">
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

        <Dialog open={modalCancelarOpen} onOpenChange={setModalCancelarOpen}>
          <DialogContent
            className="border-slate-700 bg-slate-900 text-slate-100"
            style={{ backgroundColor: CARD_BG }}
          >
            <DialogHeader>
              <DialogTitle className="text-slate-100">¿Cancelar Atención Actual?</DialogTitle>
              <DialogDescription className="text-slate-400">
                Esta acción borrará todos los datos cargados de este paciente y volverás al inicio.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setModalCancelarOpen(false)}
                className="min-h-[44px] rounded-xl border-2 border-transparent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: BLUE_MEDICAL }}
              >
                No, continuar
              </button>
              <button
                type="button"
                onClick={handleConfirmarCancelar}
                className="min-h-[44px] rounded-xl border-2 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                style={{ borderColor: RED_EMERGENCY }}
              >
                Sí, cancelar
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <footer className="mt-16 border-t px-4 py-6 text-center text-sm text-slate-500 sm:px-6" style={{ borderColor: "rgba(51, 65, 85, 0.6)", backgroundColor: "rgba(30, 41, 59, 0.5)" }}>
        <p>Ficha clínica para uso en ambulancia. Los datos se guardan localmente hasta enviar.</p>
        <p className="mt-2 text-xs text-slate-500">Build: {buildId || "…"}</p>
      </footer>
    </div>
  );
}

export default function AtencionPage(): React.ReactElement {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500" style={{ backgroundColor: BG_DARK }}>Cargando…</div>}>
      <AtencionContent />
    </Suspense>
  );
}
