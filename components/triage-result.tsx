"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { clearFichaClinica } from "@/lib/ficha-clinica-storage";
import { getOperadorId, getUnidadId } from "@/lib/operador-storage";
import { syncIntervencionToFirebase, removeIntervencionFromFirebase } from "@/lib/firebase-intervenciones";
import {
  savePendingFirebaseSync,
  clearPendingFirebaseSync,
  registroToReportSummaryData,
  buildIntervencionPayloadFromRegistro,
} from "@/lib/registro-to-finalize";
import { generateAndSharePDF } from "@/lib/share-pdf";
import { addToHistorialPdf } from "@/lib/historial-pdf-storage";
import type { NivelGravedad, NivelTriageNombre, RegistroTriage } from "@/lib/types";
import {
  DiagnosticoComboboxTriage,
  diagnosticoToNombreCie11,
  type DiagnosticoTriageValue,
} from "@/components/diagnostico-combobox-triage";
import { requiereNivelRojo } from "@/constants/diagnostics";

const RED_EMERGENCY = "#dc2626";
const BLUE_MEDICAL = "#2563eb";
const BTN_FINALIZAR_STYLE: React.CSSProperties = {
  background: `linear-gradient(135deg, ${RED_EMERGENCY} 0%, ${BLUE_MEDICAL} 100%)`,
  boxShadow: "0 0 20px rgba(37, 99, 235, 0.4), 0 4px 12px rgba(0,0,0,0.3)",
};

const DISCLAIMER_LEGAL =
  "Este es un análisis automatizado preliminar y no sustituye la evaluación de un profesional médico. En caso de emergencia, contacte al servicio local de urgencias.";

const ETIQUETAS_GRAVEDAD: Record<NivelGravedad, { label: string; color: string; colorDark: string }> = {
  1: { label: "Baja", color: "bg-emerald-100 text-emerald-800 border-emerald-200", colorDark: "bg-emerald-900/50 text-emerald-300 border-emerald-600" },
  2: { label: "Leve", color: "bg-teal-100 text-teal-800 border-teal-200", colorDark: "bg-teal-900/50 text-teal-300 border-teal-600" },
  3: { label: "Moderada", color: "bg-amber-100 text-amber-800 border-amber-200", colorDark: "bg-amber-900/50 text-amber-300 border-amber-600" },
  4: { label: "Alta", color: "bg-orange-100 text-orange-800 border-orange-200", colorDark: "bg-orange-900/50 text-orange-300 border-orange-600" },
  5: { label: "Crítica", color: "bg-red-100 text-red-800 border-red-200", colorDark: "bg-red-900/50 text-red-300 border-red-600" },
};

const COLOR_POR_NIVEL: Record<NivelTriageNombre, string> = {
  "No urgente": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Prioritario": "bg-teal-100 text-teal-800 border-teal-200",
  "Urgencia": "bg-amber-100 text-amber-800 border-amber-200",
  "Emergencia": "bg-orange-100 text-orange-800 border-orange-200",
  "Resucitación (Inmediato)": "bg-red-100 text-red-800 border-red-200",
};

const COLOR_POR_NIVEL_DARK: Record<NivelTriageNombre, string> = {
  "No urgente": "bg-emerald-900/50 text-emerald-300 border-emerald-600",
  "Prioritario": "bg-teal-900/50 text-teal-300 border-teal-600",
  "Urgencia": "bg-amber-900/50 text-amber-300 border-amber-600",
  "Emergencia": "bg-orange-900/50 text-orange-300 border-orange-600",
  "Resucitación (Inmediato)": "bg-red-900/50 text-red-300 border-red-600",
};

export interface TriageResultProps {
  registro: RegistroTriage;
  onNuevoTriage?: () => void;
  /** Si true, usa estilos dark mode (ficha clínica ambulancia). */
  darkMode?: boolean;
  /** Callback para sugerir nivel (ej. Nivel 5 Rojo al seleccionar Paro Cardiorrespiratorio). */
  onSugerirNivel?: (nivel: NivelGravedad) => void;
}

export function TriageResult({
  registro,
  onNuevoTriage,
  darkMode = true,
  onSugerirNivel,
}: TriageResultProps): React.ReactElement {
  const [openConfirmNuevoPaciente, setOpenConfirmNuevoPaciente] = React.useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = React.useState(false);
  const [finalizando, setFinalizando] = React.useState(false);
  const [mensajeExito, setMensajeExito] = React.useState<string | null>(null);
  const [diagnosticoCombobox, setDiagnosticoCombobox] = React.useState<DiagnosticoTriageValue>(() => {
    const t = registro.diagnostico_presuntivo?.trim();
    return t ? { tipo: "libre" as const, texto: t } : null;
  });

  const impresionClinica = React.useMemo(
    () => diagnosticoToNombreCie11(diagnosticoCombobox),
    [diagnosticoCombobox]
  );

  const handleFinalizarYEnviar = React.useCallback(async () => {
    setFinalizando(true);
    const operadorId = getOperadorId() || "";
    const unidadId = getUnidadId() || "";
    const payload = buildIntervencionPayloadFromRegistro(registro, operadorId, unidadId);

    try {
      if (operadorId || unidadId) {
        try {
          await syncIntervencionToFirebase(payload);
          clearPendingFirebaseSync();
        } catch {
          savePendingFirebaseSync(payload);
        }
      }
    } catch {
      if (operadorId || unidadId) savePendingFirebaseSync(payload);
    }

    const data = registroToReportSummaryData(
      registro,
      impresionClinica ? { nombre: impresionClinica.nombre, cie11: impresionClinica.cie11 } : null
    );
    try {
      const { fileUri, reportId } = await generateAndSharePDF(data);
      addToHistorialPdf(data, {
        operadorId: operadorId || undefined,
        unidadId: unidadId || undefined,
        fileUri,
        id: reportId,
      });
      setMensajeExito("Reporte Guardado Exitosamente");
      setGuardadoExitoso(true);
    } catch (e) {
      console.error("Error al generar PDF:", e);
      alert("No se pudo generar o compartir el PDF. Compruebe los permisos.");
    } finally {
      setFinalizando(false);
    }
  }, [registro, impresionClinica]);

  const handleConfirmNuevoPaciente = () => {
    removeIntervencionFromFirebase(getUnidadId() || getOperadorId() || "");
    clearFichaClinica();
    setDiagnosticoCombobox(null);
    setOpenConfirmNuevoPaciente(false);
    onNuevoTriage?.();
  };

  const handleDiagnosticoChange = React.useCallback(
    (v: DiagnosticoTriageValue) => {
      setDiagnosticoCombobox(v);
      if (v?.tipo === "codificado" && requiereNivelRojo(v.label) && onSugerirNivel && registro.nivel_gravedad < 5) {
        onSugerirNivel(5);
      }
    },
    [onSugerirNivel, registro.nivel_gravedad]
  );

  const info = ETIQUETAS_GRAVEDAD[registro.nivel_gravedad];
  const nivelNombre = registro.nivel ?? `Gravedad ${registro.nivel_gravedad}: ${info.label}`;
  const nivelColorLight =
    registro.nivel && COLOR_POR_NIVEL[registro.nivel]
      ? COLOR_POR_NIVEL[registro.nivel]
      : info.color;
  const nivelColorDark =
    registro.nivel && COLOR_POR_NIVEL_DARK[registro.nivel]
      ? COLOR_POR_NIVEL_DARK[registro.nivel]
      : info.colorDark;
  const nivelColor = darkMode ? nivelColorDark : nivelColorLight;
  const hasSignos =
    registro.signos_vitales &&
    Object.values(registro.signos_vitales).some((v) => v !== undefined && v !== "");

  const cardWrap = darkMode
    ? "rounded-2xl border border-zinc-700 bg-zinc-800/80 p-0"
    : "rounded-2xl border border-slate-200 bg-white p-0 shadow-md";
  const cardHeader = darkMode
    ? "border-b border-zinc-600 bg-zinc-700/50"
    : "border-b border-slate-100 bg-sky-50/40";
  const cardTitle = darkMode ? "text-zinc-100" : "text-slate-800";
  const labelClass = darkMode ? "text-zinc-400" : "text-slate-500";
  const valueClass = darkMode ? "text-zinc-200" : "text-slate-800";
  const valueMuted = darkMode ? "text-zinc-300" : "text-slate-700";
  const boxClass = darkMode ? "rounded-lg border border-zinc-600 bg-zinc-700/40 p-4" : "rounded-lg border border-slate-200 bg-slate-50/50 p-4";
  const boxSky = darkMode ? "rounded-xl border border-zinc-600 bg-zinc-700/40 p-4" : "rounded-xl border border-sky-200 bg-sky-50/50 p-4";
  const disclaimerClass = darkMode ? "text-zinc-500" : "text-gray-500";

  return (
    <div className="space-y-6">
      {registro.mensaje_fallback ? (
        <Alert variant="destructive" className={darkMode ? "rounded-xl border-red-800 bg-red-900/30" : "rounded-xl border-red-200 bg-red-50"}>
          <AlertTitle className={darkMode ? "text-red-200" : "text-red-800"}>Clasificación automática no disponible</AlertTitle>
          <AlertDescription className={darkMode ? "text-red-300" : "text-red-700"}>
            {registro.mensaje_fallback}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className={cardWrap}>
        <Card className="overflow-hidden border-0 shadow-none">
        <CardHeader className={cardHeader}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className={cardTitle}>Resultado del reporte</CardTitle>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${nivelColor}`}>
              {nivelNombre}
            </span>
          </div>
        </CardHeader>
        <CardContent className={`space-y-6 pt-6 ${darkMode ? "text-zinc-200" : ""}`}>
          <div>
            <p className={`text-xs font-medium uppercase tracking-wide ${labelClass}`}>Paciente</p>
            <p className={`mt-1 font-mono ${valueClass}`}>{registro.paciente_id}</p>
          </div>
          <div>
            <p className={`text-xs font-medium uppercase tracking-wide ${labelClass}`}>Síntomas reportados</p>
            <p className={`mt-1 whitespace-pre-wrap ${valueMuted}`}>{registro.sintomas_texto}</p>
          </div>
          {(hasSignos && registro.signos_vitales) || registro.pulse != null || registro.bp_systolic != null || registro.glasgow_score != null ? (
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${labelClass}`}>Signos vitales / Ficha clínica</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                {(registro.signos_vitales?.tensionArterial || (registro.bp_systolic != null && registro.bp_diastolic != null)) && (
                  <>
                    <dt className={labelClass}>Tensión arterial</dt>
                    <dd className={`font-medium ${valueClass}`}>
                      {registro.signos_vitales?.tensionArterial ?? `${registro.bp_systolic}/${registro.bp_diastolic}`}
                    </dd>
                  </>
                )}
                {(registro.signos_vitales?.frecuenciaCardiaca ?? registro.pulse) != null && (
                  <>
                    <dt className={labelClass}>Pulso / Frec. cardíaca</dt>
                    <dd className={`font-medium ${valueClass}`}>
                      {registro.signos_vitales?.frecuenciaCardiaca ?? registro.pulse} lpm
                    </dd>
                  </>
                )}
                {registro.signos_vitales?.temperatura != null && (
                  <>
                    <dt className={labelClass}>Temperatura</dt>
                    <dd className={`font-medium ${valueClass}`}>{registro.signos_vitales.temperatura} °C</dd>
                  </>
                )}
                {registro.signos_vitales?.saturacionOxigeno != null && (
                  <>
                    <dt className={labelClass}>SpO₂</dt>
                    <dd className={`font-medium ${valueClass}`}>{registro.signos_vitales.saturacionOxigeno}%</dd>
                  </>
                )}
                {(registro.signos_vitales?.frecuenciaRespiratoria ?? registro.respiration_rate) != null && (
                  <>
                    <dt className={labelClass}>Frec. respiratoria</dt>
                    <dd className={`font-medium ${valueClass}`}>
                      {registro.signos_vitales?.frecuenciaRespiratoria ?? registro.respiration_rate} /min
                    </dd>
                  </>
                )}
                {registro.glasgow_score != null && (
                  <>
                    <dt className={labelClass}>Glasgow</dt>
                    <dd className={`font-medium ${valueClass}`}>{registro.glasgow_score}</dd>
                  </>
                )}
                {registro.blood_loss != null && registro.blood_loss !== "" && (
                  <>
                    <dt className={labelClass}>Pérdida sangre</dt>
                    <dd className={`font-medium ${valueClass}`}>{registro.blood_loss}</dd>
                  </>
                )}
                {registro.airway_status != null && registro.airway_status !== "" && (
                  <>
                    <dt className={labelClass}>Vía aérea</dt>
                    <dd className={`font-medium ${valueClass}`}>{registro.airway_status}</dd>
                  </>
                )}
              </dl>
            </div>
          ) : null}
          <div className={boxClass}>
            <p className={`text-xs font-medium uppercase tracking-wide ${labelClass}`}>
              Diagnóstico / Impresión clínica <span className="text-amber-400">(obligatorio)</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Busque en la lista o escriba libre (se marcará como no estandarizado).</p>
            <div className="mt-2">
              <DiagnosticoComboboxTriage
                value={diagnosticoCombobox}
                onChange={handleDiagnosticoChange}
                placeholder="Ej. Infarto, ACV, Disnea, Paro cardiorrespiratorio…"
                required
              />
            </div>
            {diagnosticoCombobox?.tipo === "codificado" &&
              requiereNivelRojo(diagnosticoCombobox.label) &&
              registro.nivel_gravedad < 5 && (
                <div className="mt-3 rounded-lg border border-red-500/60 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                  Se ha sugerido Nivel 1 (Rojo / Resucitación) por este diagnóstico.
                </div>
              )}
            <p className={`mt-3 text-xs ${disclaimerClass}`}>{DISCLAIMER_LEGAL}</p>
          </div>
          {registro.justificacion && (
            <div className={boxClass}>
              <p className={`text-xs font-medium uppercase tracking-wide ${labelClass}`}>Justificación</p>
              <p className={`mt-2 ${valueClass}`}>{registro.justificacion}</p>
            </div>
          )}
          {registro.explicacion_tecnica && !registro.justificacion && (
            <div className={boxClass}>
              <p className={`text-xs font-medium uppercase tracking-wide ${labelClass}`}>Explicación técnica</p>
              <p className={`mt-2 ${valueClass}`}>{registro.explicacion_tecnica}</p>
            </div>
          )}
          {Array.isArray(registro.pasos_a_seguir) && registro.pasos_a_seguir.length > 0 && (
            <div className={boxSky}>
              <p className={`text-xs font-medium uppercase tracking-wide ${labelClass}`}>Pasos a seguir</p>
              <ol className={`mt-2 list-inside list-decimal space-y-1 ${valueClass}`}>
                {registro.pasos_a_seguir.map((paso, i) => (
                  <li key={i}>{paso}</li>
                ))}
              </ol>
            </div>
          )}
          <div className={boxSky}>
            <p className={`text-xs font-medium uppercase tracking-wide ${labelClass}`}>Recomendación</p>
            <p className={`mt-2 ${valueClass}`}>{registro.recomendacion}</p>
          </div>
          <p className={`text-xs ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
            Fecha y hora: {new Date(registro.fecha).toLocaleString("es")}
          </p>
          <div className="flex flex-col gap-4 pt-4">
            {!guardadoExitoso && onNuevoTriage && (
              <Button
                type="button"
                onClick={handleFinalizarYEnviar}
                disabled={finalizando}
                className="min-h-[56px] w-full rounded-xl text-lg font-semibold text-white transition active:scale-[0.98] disabled:opacity-70"
                style={BTN_FINALIZAR_STYLE}
              >
                {finalizando ? "Guardando y generando PDF…" : "FINALIZAR Y ENVIAR A CENTRAL"}
              </Button>
            )}
            {mensajeExito && (
              <p className="rounded-xl border border-emerald-600/50 bg-emerald-900/30 px-4 py-3 text-center font-medium text-emerald-200">
                {mensajeExito}
              </p>
            )}
            {guardadoExitoso && onNuevoTriage && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenConfirmNuevoPaciente(true)}
                className={darkMode ? "min-h-[52px] border-zinc-600 bg-zinc-700 text-zinc-100 hover:bg-zinc-600" : ""}
              >
                Nuevo Paciente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      <Dialog open={openConfirmNuevoPaciente} onOpenChange={setOpenConfirmNuevoPaciente}>
        <DialogContent className={darkMode ? "border-zinc-700 bg-zinc-800 text-zinc-100" : ""}>
          <DialogHeader>
            <DialogTitle className={darkMode ? "text-zinc-100" : ""}>¿Nuevo paciente?</DialogTitle>
            <DialogDescription className={darkMode ? "text-zinc-400" : ""}>
              Se borrarán los datos guardados en este dispositivo (ficha clínica y tiempos). Solo debe usarse después de haber enviado el reporte actual.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenConfirmNuevoPaciente(false)}
              className={darkMode ? "border-zinc-600 text-zinc-200 hover:bg-zinc-700" : ""}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmNuevoPaciente}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Sí, nuevo paciente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
