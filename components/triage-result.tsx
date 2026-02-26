"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { NivelGravedad, NivelTriageNombre, RegistroTriage } from "@/lib/types";

const DISCLAIMER_LEGAL =
  "Este es un análisis automatizado preliminar y no sustituye la evaluación de un profesional médico. En caso de emergencia, contacte al servicio local de urgencias.";

const ETIQUETAS_GRAVEDAD: Record<NivelGravedad, { label: string; color: string }> = {
  1: { label: "Baja", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  2: { label: "Leve", color: "bg-teal-100 text-teal-800 border-teal-200" },
  3: { label: "Moderada", color: "bg-amber-100 text-amber-800 border-amber-200" },
  4: { label: "Alta", color: "bg-orange-100 text-orange-800 border-orange-200" },
  5: { label: "Crítica", color: "bg-red-100 text-red-800 border-red-200" },
};

const COLOR_POR_NIVEL: Record<NivelTriageNombre, string> = {
  "No urgente": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Prioritario": "bg-teal-100 text-teal-800 border-teal-200",
  "Urgencia": "bg-amber-100 text-amber-800 border-amber-200",
  "Emergencia": "bg-orange-100 text-orange-800 border-orange-200",
  "Resucitación (Inmediato)": "bg-red-100 text-red-800 border-red-200",
};

export interface TriageResultProps {
  registro: RegistroTriage;
  onNuevoTriage?: () => void;
}

export function TriageResult({ registro, onNuevoTriage }: TriageResultProps): React.ReactElement {
  const info = ETIQUETAS_GRAVEDAD[registro.nivel_gravedad];
  const nivelNombre = registro.nivel ?? `Gravedad ${registro.nivel_gravedad}: ${info.label}`;
  const nivelColor =
    registro.nivel && COLOR_POR_NIVEL[registro.nivel]
      ? COLOR_POR_NIVEL[registro.nivel]
      : info.color;
  const hasSignos =
    registro.signos_vitales &&
    Object.values(registro.signos_vitales).some((v) => v !== undefined && v !== "");

  return (
    <div className="space-y-6">
      {registro.mensaje_fallback ? (
        <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50">
          <AlertTitle className="text-red-800">Clasificación automática no disponible</AlertTitle>
          <AlertDescription className="text-red-700">
            {registro.mensaje_fallback}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Área Resultado: bordes redondeados y sombra suave */}
      <div className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md">
        <Card className="overflow-hidden border-0 shadow-none">
        <CardHeader className="border-b border-slate-100 bg-sky-50/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-slate-800">Resultado del triaje</CardTitle>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${nivelColor}`}
            >
              {nivelNombre}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Paciente
            </p>
            <p className="mt-1 font-mono text-slate-800">{registro.paciente_id}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Síntomas reportados
            </p>
            <p className="mt-1 text-slate-700 whitespace-pre-wrap">{registro.sintomas_texto}</p>
          </div>
          {hasSignos && registro.signos_vitales && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Signos vitales
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                {registro.signos_vitales.tensionArterial != null && (
                  <>
                    <dt className="text-slate-500">Tensión arterial</dt>
                    <dd className="font-medium text-slate-800">
                      {registro.signos_vitales.tensionArterial}
                    </dd>
                  </>
                )}
                {registro.signos_vitales.frecuenciaCardiaca != null && (
                  <>
                    <dt className="text-slate-500">Frec. cardíaca</dt>
                    <dd className="font-medium text-slate-800">
                      {registro.signos_vitales.frecuenciaCardiaca} lpm
                    </dd>
                  </>
                )}
                {registro.signos_vitales.temperatura != null && (
                  <>
                    <dt className="text-slate-500">Temperatura</dt>
                    <dd className="font-medium text-slate-800">
                      {registro.signos_vitales.temperatura} °C
                    </dd>
                  </>
                )}
                {registro.signos_vitales.saturacionOxigeno != null && (
                  <>
                    <dt className="text-slate-500">SpO₂</dt>
                    <dd className="font-medium text-slate-800">
                      {registro.signos_vitales.saturacionOxigeno}%
                    </dd>
                  </>
                )}
                {registro.signos_vitales.frecuenciaRespiratoria != null && (
                  <>
                    <dt className="text-slate-500">Frec. respiratoria</dt>
                    <dd className="font-medium text-slate-800">
                      {registro.signos_vitales.frecuenciaRespiratoria} /min
                    </dd>
                  </>
                )}
              </dl>
            </div>
          )}
          {registro.diagnostico_presuntivo && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Diagnóstico presuntivo
              </p>
              <p className="mt-2 text-slate-800">{registro.diagnostico_presuntivo}</p>
              <p className="mt-3 text-xs text-gray-500">{DISCLAIMER_LEGAL}</p>
            </div>
          )}
          {registro.justificacion && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Justificación
              </p>
              <p className="mt-2 text-slate-800">{registro.justificacion}</p>
            </div>
          )}
          {registro.explicacion_tecnica && !registro.justificacion && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Explicación técnica
              </p>
              <p className="mt-2 text-slate-800">{registro.explicacion_tecnica}</p>
            </div>
          )}
          {!registro.diagnostico_presuntivo && (
            <p className="text-xs text-gray-500">{DISCLAIMER_LEGAL}</p>
          )}
          {Array.isArray(registro.pasos_a_seguir) && registro.pasos_a_seguir.length > 0 && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Pasos a seguir
              </p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-slate-800">
                {registro.pasos_a_seguir.map((paso, i) => (
                  <li key={i}>{paso}</li>
                ))}
              </ol>
            </div>
          )}
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Recomendación
            </p>
            <p className="mt-2 text-slate-800">{registro.recomendacion}</p>
          </div>
          <p className="text-xs text-slate-400">
            Fecha y hora: {new Date(registro.fecha).toLocaleString("es")}
          </p>
          {onNuevoTriage && (
            <button
              type="button"
              onClick={onNuevoTriage}
              className="text-sm font-medium text-[var(--medical-slate-blue)] hover:underline"
            >
              Realizar otro triaje
            </button>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
