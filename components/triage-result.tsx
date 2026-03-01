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
import type { NivelGravedad, NivelTriageNombre, RegistroTriage } from "@/lib/types";

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
}

export function TriageResult({ registro, onNuevoTriage, darkMode = true }: TriageResultProps): React.ReactElement {
  const [openConfirmNuevoPaciente, setOpenConfirmNuevoPaciente] = React.useState(false);

  const handleConfirmNuevoPaciente = () => {
    clearFichaClinica();
    setOpenConfirmNuevoPaciente(false);
    onNuevoTriage?.();
  };

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
  const linkClass = darkMode ? "text-emerald-400 hover:underline" : "text-[var(--medical-slate-blue)] hover:underline";

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
          {registro.diagnostico_presuntivo && (
            <div className={boxClass}>
              <p className={`text-xs font-medium uppercase tracking-wide ${labelClass}`}>Diagnóstico presuntivo</p>
              <p className={`mt-2 ${valueClass}`}>{registro.diagnostico_presuntivo}</p>
              <p className={`mt-3 text-xs ${disclaimerClass}`}>{DISCLAIMER_LEGAL}</p>
            </div>
          )}
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
          {!registro.diagnostico_presuntivo && <p className={`text-xs ${disclaimerClass}`}>{DISCLAIMER_LEGAL}</p>}
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
          <div className="flex flex-wrap gap-3 pt-2">
            {onNuevoTriage && (
              <>
                <button type="button" onClick={onNuevoTriage} className={`text-sm font-medium ${linkClass}`}>
                  Realizar otra ficha / triaje
                </button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenConfirmNuevoPaciente(true)}
                  className={darkMode ? "min-h-[44px] border-zinc-600 bg-zinc-700 text-zinc-100 hover:bg-zinc-600" : ""}
                >
                  Nuevo Paciente
                </Button>
              </>
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
