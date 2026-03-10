"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SignosVitales } from "@/lib/types";
import type { DiagnosticoCIE } from "@/lib/diagnosticos-emergencias";
import {
  loadFichaClinica,
  saveFichaClinica,
  type TimestampEvento,
} from "@/lib/ficha-clinica-storage";
import { DiagnosticoAutocomplete } from "@/components/diagnostico-autocomplete";
import { generateAndSharePDFSafe, generateAndDownloadPDF, canUseShare, PDF_ERROR_MENSAJE_DATOS_GUARDADOS } from "@/lib/share-pdf";
import type { ReportSummaryData } from "@/lib/report-summary";
import { addToHistorialPdf } from "@/lib/historial-pdf-storage";
import { getAuthInstance } from "@/lib/firebase";
import { sanitizeFirestoreData } from "@/lib/clean-object";
import { getOperadorId, getUnidadId, getAtendidoPor } from "@/lib/operador-storage";
import { syncIntervencionToFirebase, removeIntervencionFromFirebase } from "@/lib/firebase-intervenciones";
import { postAtencion } from "@/lib/api";
import { generateReportId } from "@/lib/report-id";
import { hapticImpactMedium } from "@/lib/haptics";
import { ToastTimestamp } from "@/components/toast-timestamp";

export type EstadoXABCDE = "pendiente" | "ok" | "no-aplica";

const XABCDE_ITEMS: { letra: string; titulo: string; descripcion: string }[] = [
  { letra: "X", titulo: "eXanguinación", descripcion: "Control de hemorragias masivas" },
  { letra: "A", titulo: "Vía aérea", descripcion: "Airway - Permeabilidad" },
  { letra: "B", titulo: "Respiración", descripcion: "Breathing - Ventilación" },
  { letra: "C", titulo: "Circulación", descripcion: "Circulation - Perfusión" },
  { letra: "D", titulo: "Discapacidad", descripcion: "Disability - Glasgow" },
  { letra: "E", titulo: "Exposición", descripcion: "Exposure - Ambiente" },
];

/** Glasgow: Ocular 1-4, Verbal 1-5, Motor 1-6 */
const GLASGOW_OCULAR = [
  { value: 0, label: "—" },
  { value: 1, label: "1 - Ninguna" },
  { value: 2, label: "2 - Al dolor" },
  { value: 3, label: "3 - A la voz" },
  { value: 4, label: "4 - Espontáneo" },
];
const GLASGOW_VERBAL = [
  { value: 0, label: "—" },
  { value: 1, label: "1 - Ninguna" },
  { value: 2, label: "2 - Sonidos incomprensibles" },
  { value: 3, label: "3 - Palabras inapropiadas" },
  { value: 4, label: "4 - Confuso" },
  { value: 5, label: "5 - Orientado" },
];
const GLASGOW_MOTOR = [
  { value: 0, label: "—" },
  { value: 1, label: "1 - Ninguna" },
  { value: 2, label: "2 - Extensión al dolor" },
  { value: 3, label: "3 - Flexión anormal" },
  { value: 4, label: "4 - Retirada al dolor" },
  { value: 5, label: "5 - Localiza dolor" },
  { value: 6, label: "6 - Obedece órdenes" },
];

export interface DatosEvaluacionInicial {
  hora_inicio_atencion: string;
  paciente_id: string;
  nombre_paciente: string;
  dni: string;
  sintomas_texto: string;
  xabcde: Record<string, EstadoXABCDE>;
  signos_vitales: SignosVitales;
  glasgow?: { E: number; V: number; M: number; puntaje_glasgow: number };
  glasgow_score?: number;
  blood_loss?: string;
  airway_status?: string;
  respiration_rate?: number;
  pulse?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  timestamp_eventos?: TimestampEvento[];
  /** Diagnóstico presuntivo con CIE-11 (solo término común en UI; código y descripción en PDF/Firebase). */
  diagnostico?: DiagnosticoCIE | null;
}

function formatHora(date: Date): string {
  return date.toISOString();
}

export interface ChecklistXABCDEProps {
  onSubmit: (data: DatosEvaluacionInicial) => void;
  isSubmitting?: boolean;
  /** Llamado después de generar y guardar el PDF; el padre puede limpiar Firebase y formulario. */
  onNuevaAtencion?: () => void;
  /** Llamado tras finalizar atención con éxito (guardado + PDF). Si se pasa, se usa en lugar de onNuevaAtencion para redirigir (ej. al Panel de Gestión). */
  onFinalizarSuccess?: () => void;
  /** Email del usuario logueado (Firebase Auth) para guardar en Firestore. */
  userEmail?: string;
}

const CARD_BG = "#1e293b";
const BLUE_MEDICAL = "#2563eb";
const RED_EMERGENCY = "#dc2626";

const CARD_DARK = "rounded-lg border text-slate-100 shadow-sm";
const CARD_DARK_STYLE = { backgroundColor: CARD_BG, borderColor: "rgba(37, 99, 235, 0.35)" };
const INPUT_DARK =
  "min-h-[36px] rounded-md border-2 border-slate-600 bg-slate-800/80 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]";
const LABEL_DARK = "text-xs font-medium text-slate-300";
const BTN_GRADIENT =
  "min-h-[44px] touch-manipulation rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98]";
const BTN_GRADIENT_STYLE = {
  background: `linear-gradient(135deg, ${RED_EMERGENCY} 0%, ${BLUE_MEDICAL} 100%)`,
  boxShadow: "0 0 16px rgba(37, 99, 235, 0.35), 0 2px 8px rgba(0,0,0,0.25)",
};

export function ChecklistXABCDE({ onSubmit, onNuevaAtencion, onFinalizarSuccess, userEmail }: ChecklistXABCDEProps): React.ReactElement {
  const [horaInicio, setHoraInicio] = React.useState<string>("");
  const [inicioRegistrado, setInicioRegistrado] = React.useState(false);
  const [pacienteId, setPacienteId] = React.useState("");
  const [nombrePaciente, setNombrePaciente] = React.useState("");
  const [dni, setDni] = React.useState("");
  const [sintomasTexto, setSintomasTexto] = React.useState("");
  const [xabcde, setXabcde] = React.useState<Record<string, EstadoXABCDE>>({
    X: "pendiente",
    A: "pendiente",
    B: "pendiente",
    C: "pendiente",
    D: "pendiente",
    E: "pendiente",
  });
  const [bloodLoss, setBloodLoss] = React.useState("");
  const [airwayStatus, setAirwayStatus] = React.useState("");
  const [respirationRate, setRespirationRate] = React.useState("");
  const [pulse, setPulse] = React.useState("");
  const [bpSystolic, setBpSystolic] = React.useState("");
  const [bpDiastolic, setBpDiastolic] = React.useState("");
  const [saturacionOxigeno, setSaturacionOxigeno] = React.useState("");
  const [glasgowE, setGlasgowE] = React.useState<number>(0);
  const [glasgowV, setGlasgowV] = React.useState<number>(0);
  const [glasgowM, setGlasgowM] = React.useState<number>(0);
  const [timestampEventos, setTimestampEventos] = React.useState<TimestampEvento[]>([]);
  const [timestampInput, setTimestampInput] = React.useState("");
  const [diagnosticoPresuntivo, setDiagnosticoPresuntivo] = React.useState<DiagnosticoCIE | null>(null);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [finalizando, setFinalizando] = React.useState(false);
  const [atencionFinalizada, setAtencionFinalizada] = React.useState(false);
  const [lastData, setLastData] = React.useState<ReportSummaryData | null>(null);
  const [compartirPdfLoading, setCompartirPdfLoading] = React.useState(false);
  const [syncError, setSyncError] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [pulseButtonKey, setPulseButtonKey] = React.useState<string | null>(null);
  const [lastAddedHora, setLastAddedHora] = React.useState<string | null>(null);

  const persistRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const timestampInputRef = React.useRef<HTMLInputElement>(null);

  const TOTAL_STEPS = 12;

  /** Reset atómico: limpia todo el estado del checklist (triaje, signos vitales, paciente, eventos, diagnóstico). Combinado con onFinalizarSuccess → clearFichaClinica + removeIntervencionFromFirebase en el padre, deja la app lista para el siguiente paciente. */
  const resetForm = React.useCallback(() => {
    setHoraInicio("");
    setInicioRegistrado(false);
    setPacienteId("");
    setNombrePaciente("");
    setDni("");
    setSintomasTexto("");
    setXabcde({ X: "pendiente", A: "pendiente", B: "pendiente", C: "pendiente", D: "pendiente", E: "pendiente" });
    setBloodLoss("");
    setAirwayStatus("");
    setRespirationRate("");
    setPulse("");
    setBpSystolic("");
    setBpDiastolic("");
    setSaturacionOxigeno("");
    setGlasgowE(0);
    setGlasgowV(0);
    setGlasgowM(0);
    setTimestampEventos([]);
    setTimestampInput("");
    setDiagnosticoPresuntivo(null);
    setCurrentStep(0);
    setFinalizando(false);
    setAtencionFinalizada(false);
    setLastData(null);
    setSyncError(false);
    setToastMessage(null);
    setLastAddedHora(null);
  }, []);

  const handleNuevaAtencionClick = React.useCallback(() => {
    resetForm();
    setCurrentStep(0);
    onNuevaAtencion?.();
  }, [resetForm, onNuevaAtencion]);

  const STEP_LABELS: { letra?: string; titulo: string }[] = [
    { titulo: "Inicio" },
    { letra: "X", titulo: "eXanguinación" },
    { letra: "A", titulo: "Vía aérea" },
    { letra: "B", titulo: "Respiración" },
    { letra: "C", titulo: "Circulación" },
    { letra: "D", titulo: "Discapacidad" },
    { letra: "E", titulo: "Exposición" },
    { titulo: "Signos vitales" },
    { titulo: "Glasgow" },
    { titulo: "Timestamps" },
    { titulo: "Paciente" },
    { titulo: "Enviar" },
  ];

  const persist = React.useCallback(() => {
    saveFichaClinica({
      hora_inicio_atencion: horaInicio,
      paciente_id: pacienteId,
      nombre_paciente: nombrePaciente,
      dni: dni,
      sintomas_texto: sintomasTexto,
      xabcde: xabcde as Record<string, string>,
      blood_loss: bloodLoss,
      airway_status: airwayStatus,
      respiration_rate: respirationRate,
      pulse: pulse,
      bp_systolic: bpSystolic,
      bp_diastolic: bpDiastolic,
      saturacion_oxigeno: saturacionOxigeno,
      glasgowE,
      glasgowV,
      glasgowM,
      timestamp_eventos: timestampEventos,
      currentStep,
      diagnostico: diagnosticoPresuntivo,
    });
  }, [
    horaInicio,
    pacienteId,
    nombrePaciente,
    dni,
    sintomasTexto,
    xabcde,
    bloodLoss,
    airwayStatus,
    respirationRate,
    pulse,
    bpSystolic,
    bpDiastolic,
    saturacionOxigeno,
    glasgowE,
    glasgowV,
    glasgowM,
    timestampEventos,
    currentStep,
    diagnosticoPresuntivo,
  ]);

  React.useEffect(() => {
    const loaded = loadFichaClinica();
    if (!loaded) return;
    setHoraInicio(loaded.hora_inicio_atencion || "");
    setInicioRegistrado(!!loaded.hora_inicio_atencion);
    setPacienteId(loaded.paciente_id || "");
    setNombrePaciente(loaded.nombre_paciente || "");
    setDni(loaded.dni || "");
    setSintomasTexto(loaded.sintomas_texto || "");
    setXabcde((prev) => ({ ...prev, ...(loaded.xabcde as Record<string, EstadoXABCDE>) }));
    setBloodLoss(loaded.blood_loss || "");
    setAirwayStatus(loaded.airway_status || "");
    setRespirationRate(loaded.respiration_rate || "");
    setPulse(loaded.pulse || "");
    setBpSystolic(loaded.bp_systolic || "");
    setBpDiastolic(loaded.bp_diastolic || "");
    setSaturacionOxigeno(loaded.saturacion_oxigeno || "");
    setGlasgowE(loaded.glasgowE ?? 0);
    setGlasgowV(loaded.glasgowV ?? 0);
    setGlasgowM(loaded.glasgowM ?? 0);
    setTimestampEventos(loaded.timestamp_eventos || []);
    setDiagnosticoPresuntivo(loaded.diagnostico ?? null);
    setCurrentStep(Math.min(Math.max(0, loaded.currentStep ?? 0), TOTAL_STEPS - 1));
  }, []);

  React.useEffect(() => {
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = setTimeout(persist, 400);
    return () => {
      if (persistRef.current) clearTimeout(persistRef.current);
    };
  }, [persist]);

  const hasRCP = React.useMemo(() => {
    const hasRcpEvent = (timestampEventos ?? []).some((e) =>
      String(e.evento).toUpperCase().includes("RCP")
    );
    const hasRcpText = (sintomasTexto ?? "").toUpperCase().includes("RCP");
    return hasRcpEvent || hasRcpText;
  }, [timestampEventos, sintomasTexto]);

  const puntajeGlasgow = glasgowE + glasgowV + glasgowM;

  React.useEffect(() => {
    const operadorId = getOperadorId() || "";
    const unidadId = getUnidadId() || "";
    if (!operadorId && !unidadId) return;
    const datos = {
      operadorId,
      unidadId,
      updatedAt: new Date().toISOString(),
      currentStep,
      paciente_id: pacienteId.trim() || undefined,
      nombre_paciente: nombrePaciente.trim() || undefined,
      dni: dni.trim() || undefined,
      sintomas_texto: sintomasTexto.trim() || undefined,
      xabcde: xabcde as Record<string, string>,
      hora_inicio_atencion: horaInicio || undefined,
      timestamp_eventos:
        timestampEventos.length > 0 ? timestampEventos : undefined,
      glasgow_score: puntajeGlasgow > 0 ? puntajeGlasgow : undefined,
      hasRCP,
      atendido_por: getAtendidoPor() || undefined,
      diagnostico_presuntivo: diagnosticoPresuntivo
        ? {
            termino_comun: diagnosticoPresuntivo.termino_comun,
            codigo_cie: diagnosticoPresuntivo.codigo_cie,
            descripcion_tecnica: diagnosticoPresuntivo.descripcion_tecnica,
          }
        : undefined,
    };
    const t = setTimeout(() => syncIntervencionToFirebase(datos).catch(() => {}), 100);
    return () => clearTimeout(t);
  }, [
    currentStep,
    pacienteId,
    nombrePaciente,
    dni,
    sintomasTexto,
    xabcde,
    horaInicio,
    timestampEventos,
    puntajeGlasgow,
    hasRCP,
    diagnosticoPresuntivo,
  ]);

  const registrarInicio = React.useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[Checklist] registrarInicio — inicio instantáneo a las", new Date().toISOString());
    }
    const now = new Date();
    setHoraInicio(formatHora(now));
    setInicioRegistrado(true);
  }, []);

  const cicloEstado = (letra: string): EstadoXABCDE => {
    const actual = xabcde[letra] ?? "pendiente";
    if (actual === "pendiente") return "ok";
    if (actual === "ok") return "no-aplica";
    return "pendiente";
  };

  const toggleXABCDE = (letra: string) => {
    setXabcde((prev) => ({ ...prev, [letra]: cicloEstado(letra) }));
  };

  const agregarTimestamp = React.useCallback((eventoLabel?: string) => {
    const evento = eventoLabel ?? (timestampInput.trim() || "Evento");
    const now = new Date();
    const hora = formatHora(now);
    const horaDisplay = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    hapticImpactMedium();
    setToastMessage(`Evento Registrado: ${evento} - ${horaDisplay}`);
    setPulseButtonKey(eventoLabel ?? "_custom");
    setLastAddedHora(hora);
    setTimestampEventos((prev) => [...prev, { evento, hora }]);
    if (!eventoLabel) setTimestampInput("");

    setTimeout(() => setPulseButtonKey(null), 400);
  }, [timestampInput]);

  /** Cuántas veces se ha registrado este evento (para badge). */
  const countByEvento = React.useCallback((label: string) => {
    return timestampEventos.filter((ev) => ev.evento === label).length;
  }, [timestampEventos]);

  /** Botonera táctica: eventos intermedios (un toque = registro con timestamp). Llegada Hosp. va solo al final del flujo. */
  const BOTONES_QUICK_GRID = [
    { label: "Salida/Llegada Escena", color: "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white" },
    { label: "Adrenalina", color: "bg-red-600 hover:bg-red-500 border-red-500 text-white" },
    { label: "Descarga DEA", color: "bg-blue-600 hover:bg-blue-500 border-blue-500 text-white" },
    { label: "Oxígeno", color: "bg-cyan-600 hover:bg-cyan-500 border-cyan-500 text-white" },
    { label: "Medicación", color: "bg-violet-600 hover:bg-violet-500 border-violet-500 text-white" },
    { label: "Otro", color: "bg-slate-600 hover:bg-slate-500 border-slate-500 text-white" },
  ] as const;
  const EVENTO_CIERRE = "Llegada al Hospital";

  const glasgowCompleto = glasgowE > 0 && glasgowV > 0 && glasgowM > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === TOTAL_STEPS - 1) return;
    const signos: SignosVitales = {};
    if (pulse) signos.frecuenciaCardiaca = Number(pulse);
    if (saturacionOxigeno) signos.saturacionOxigeno = Number(saturacionOxigeno);
    if (bpSystolic && bpDiastolic) signos.tensionArterial = `${bpSystolic}/${bpDiastolic}`;
    if (respirationRate) signos.frecuenciaRespiratoria = Number(respirationRate);

    onSubmit({
      hora_inicio_atencion: horaInicio || formatHora(new Date()),
      paciente_id: pacienteId.trim() || "sin-id",
      nombre_paciente: nombrePaciente.trim(),
      dni: dni.trim(),
      sintomas_texto: sintomasTexto.trim() || "Ficha clínica XABCDE",
      xabcde,
      signos_vitales: signos,
      glasgow: glasgowCompleto
        ? { E: glasgowE, V: glasgowV, M: glasgowM, puntaje_glasgow: puntajeGlasgow }
        : undefined,
      glasgow_score: puntajeGlasgow > 0 ? puntajeGlasgow : undefined,
      blood_loss: bloodLoss.trim() || undefined,
      airway_status: airwayStatus.trim() || undefined,
      respiration_rate: respirationRate ? Number(respirationRate) : undefined,
      pulse: pulse ? Number(pulse) : undefined,
      bp_systolic: bpSystolic ? Number(bpSystolic) : undefined,
      bp_diastolic: bpDiastolic ? Number(bpDiastolic) : undefined,
      timestamp_eventos: timestampEventos.length > 0 ? timestampEventos : undefined,
    });
  };

  const colorEstado = (estado: EstadoXABCDE): string => {
    if (estado === "ok") return "bg-emerald-600 text-white border-emerald-500";
    if (estado === "no-aplica") return "bg-zinc-500 text-zinc-200 border-zinc-400";
    return "bg-amber-600 text-white border-amber-500";
  };

  const progressPct = ((currentStep + 1) / TOTAL_STEPS) * 100;
  const currentLabel = STEP_LABELS[currentStep];
  const progressText = currentLabel.letra
    ? `Progreso: ${currentLabel.letra} - ${currentLabel.titulo}`
    : `Progreso: ${currentLabel.titulo}`;
  const isGlasgowStepComplete = currentStep === 8 && glasgowCompleto;
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const buildReportSummaryData = (): ReportSummaryData => {
    const signos: SignosVitales = {};
    if (pulse) signos.frecuenciaCardiaca = Number(pulse);
    if (saturacionOxigeno) signos.saturacionOxigeno = Number(saturacionOxigeno);
    if (bpSystolic && bpDiastolic) signos.tensionArterial = `${bpSystolic}/${bpDiastolic}`;
    if (respirationRate) signos.frecuenciaRespiratoria = Number(respirationRate);
    return {
      hora_inicio_atencion: horaInicio || undefined,
      paciente_id: pacienteId.trim() || undefined,
      nombre_paciente: nombrePaciente.trim() || undefined,
      dni: dni.trim() || undefined,
      sintomas_texto: (sintomasTexto?.trim() ?? "") || "Ficha clínica XABCDE",
      xabcde: xabcde as Record<string, string>,
      signos_vitales: Object.keys(signos).length > 0 ? signos : undefined,
      glasgow: glasgowCompleto ? { E: glasgowE, V: glasgowV, M: glasgowM, puntaje_glasgow: puntajeGlasgow } : undefined,
      glasgow_score: puntajeGlasgow > 0 ? puntajeGlasgow : undefined,
      blood_loss: bloodLoss.trim() || undefined,
      airway_status: airwayStatus.trim() || undefined,
      respiration_rate: respirationRate ? Number(respirationRate) : undefined,
      pulse: pulse ? Number(pulse) : undefined,
      bp_systolic: bpSystolic ? Number(bpSystolic) : undefined,
      bp_diastolic: bpDiastolic ? Number(bpDiastolic) : undefined,
      timestamp_eventos: timestampEventos.length > 0 ? timestampEventos : undefined,
      diagnostico: diagnosticoPresuntivo ?? undefined,
    };
  };

  /** Flujo FINALIZAR ATENCIÓN: solo API Vercel → si OK, PDF → reset y redirección al Panel de Gestión. */
  const handleFinalizarAtencion = async () => {
    setSyncError(false);
    setFinalizando(true);
    setToastMessage("Guardando...");
    const auth = getAuthInstance();
    if (!auth?.currentUser) {
      setFinalizando(false);
      setToastMessage("Debe iniciar sesión de nuevo para guardar.");
      if (typeof alert === "function") alert("Sesión expirada. Debe re-autenticarse para guardar.");
      return;
    }
    const operadorId = getOperadorId() || "";
    const unidadId = getUnidadId() || "";
    const data = buildReportSummaryData();
    const reportId = generateReportId();
    const nombrePacienteVal = (data.nombre_paciente ?? "").trim() || "Sin nombre";
    const pacienteIdVal = (data.paciente_id ?? "").trim() || "sin-id";
    const entry = {
      id: reportId,
      createdAt: new Date().toISOString(),
      nombrePaciente: nombrePacienteVal,
      pacienteId: pacienteIdVal,
      operadorId: operadorId || undefined,
      unidadId: unidadId || undefined,
      data,
      diagnostico_codigo: diagnosticoPresuntivo?.codigo_cie,
    };
    const paramedicoNombre = getAtendidoPor() || operadorId || "Paramédico";
    const paramedicoEmail = (userEmail ?? "").trim() || undefined;
    const cleanData = sanitizeFirestoreData(entry);
    const apiPayload = { ...(cleanData as Record<string, unknown>), paramedicoNombre, paramedicoEmail };

    let apiResult: { status: number; data: { id?: string; report_id?: string | null; error?: string } };
    try {
      apiResult = await postAtencion(apiPayload);
    } catch (e) {
      setFinalizando(false);
      setSyncError(true);
      const isTimeout = e instanceof Error && e.message === "TIMEOUT";
      const isNetwork = e instanceof TypeError && (e.message === "Failed to fetch" || e.message?.includes("fetch"));
      const msg =
        isTimeout || isNetwork
          ? "Error de conexión. Revisá tu internet y volvé a intentarlo."
          : e instanceof Error
            ? e.message
            : "Error de conexión. Revisá tu internet y volvé a intentarlo.";
      setToastMessage(msg);
      if (typeof alert === "function") alert(msg);
      return;
    }

    const saved = apiResult.status >= 200 && apiResult.status < 300;
    if (!saved) {
      setFinalizando(false);
      setSyncError(true);
      const errMsg =
        typeof apiResult.data === "object" && apiResult.data !== null && "error" in apiResult.data
          ? String((apiResult.data as { error: unknown }).error)
          : "No se pudo guardar. Revisá la conexión e intentá de nuevo.";
      setToastMessage(errMsg);
      if (typeof alert === "function") alert(errMsg);
      return;
    }

    removeIntervencionFromFirebase(unidadId || operadorId);
    setLastData(data);

    try {
      if (canUseShare()) {
        const result = await generateAndSharePDFSafe(data);
        if (result.error) setToastMessage(result.error);
        else {
          addToHistorialPdf(data, {
            operadorId: operadorId || undefined,
            unidadId: unidadId || undefined,
            fileUri: result.fileUri,
            id: result.reportId,
          });
          setToastMessage("Atención guardada. PDF generado.");
        }
      } else {
        try {
          const result = await generateAndDownloadPDF(data);
          addToHistorialPdf(data, { operadorId: operadorId || undefined, unidadId: unidadId || undefined, id: result.reportId });
          setToastMessage("Atención guardada. PDF descargado.");
        } catch {
          setToastMessage(PDF_ERROR_MENSAJE_DATOS_GUARDADOS);
        }
      }
    } catch {
      setToastMessage(PDF_ERROR_MENSAJE_DATOS_GUARDADOS);
    } finally {
      setFinalizando(false);
      resetForm();
      if (onFinalizarSuccess) {
        onFinalizarSuccess();
      } else {
        handleNuevaAtencionClick();
      }
    }
  };

  /** Opcional: genera y comparte/descarga el PDF. No bloquea; si falla solo se muestra toast. */
  const handleCompartirPDF = React.useCallback(async () => {
    const data = lastData ?? buildReportSummaryData();
    setCompartirPdfLoading(true);
    try {
      if (canUseShare()) {
        const result = await generateAndSharePDFSafe(data);
        if (result.error) {
          setToastMessage(result.error);
          return;
        }
        addToHistorialPdf(data, {
          operadorId: getOperadorId() || undefined,
          unidadId: getUnidadId() || undefined,
          fileUri: result.fileUri,
          id: result.reportId,
        });
        setToastMessage("PDF generado y compartido.");
        setLastData(data);
      } else {
        const result = await generateAndDownloadPDF(data);
        const operadorId = getOperadorId() || "";
        const unidadId = getUnidadId() || "";
        addToHistorialPdf(data, { operadorId: operadorId || undefined, unidadId: unidadId || undefined, id: result.reportId });
        setToastMessage("PDF descargado.");
      }
    } catch (e) {
      console.warn("Error al generar PDF:", e);
      setToastMessage("No se pudo generar el PDF. Puede iniciar una nueva atención.");
    } finally {
      setCompartirPdfLoading(false);
    }
  // lastData es el dato enviado al finalizar; buildReportSummaryData es estable en comportamiento
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastData]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card className={CARD_DARK} style={CARD_DARK_STYLE}>
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-sm text-slate-100">Hora de inicio</CardTitle>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Input readOnly value={horaInicio || "—"} className={`max-w-[180px] font-mono ${INPUT_DARK}`} aria-label="Hora de inicio" />
                {!inicioRegistrado ? (
                  <Button type="button" onClick={registrarInicio} className={BTN_GRADIENT} style={BTN_GRADIENT_STYLE}>
                    Iniciar atención
                  </Button>
                ) : (
                  <span className="text-xs font-medium text-blue-400">Registrada</span>
                )}
              </div>
            </CardHeader>
          </Card>
        );
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6: {
        const idx = currentStep - 1;
        const item = XABCDE_ITEMS[idx];
        return (
          <Card className={CARD_DARK} style={CARD_DARK_STYLE}>
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm text-slate-100">{item.letra} — {item.titulo}</CardTitle>
              <p className="text-[10px] text-slate-400">{item.descripcion}. Toque: Pendiente → OK → No aplica</p>
            </CardHeader>
            <CardContent className="p-2 pt-1">
              <button
                type="button"
                onClick={() => toggleXABCDE(item.letra)}
                className={`flex min-h-[42px] w-full touch-manipulation items-center justify-between rounded-md border-2 px-2 py-1.5 text-left text-sm transition active:scale-[0.98] ${colorEstado(xabcde[item.letra] ?? "pendiente")}`}
              >
                <span className="text-xl font-bold">{item.letra}</span>
                <div className="text-right">
                  <p className="font-semibold">{item.titulo}</p>
                  <p className="text-xs opacity-90">{item.descripcion}</p>
                </div>
              </button>
            </CardContent>
          </Card>
        );
      }
      case 7:
        return (
          <Card className={CARD_DARK} style={CARD_DARK_STYLE}>
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm text-slate-100">Signos vitales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 p-2 pt-1">
              <div><Label className={`${LABEL_DARK} text-sm`}>Pérdida sangre</Label><Input value={bloodLoss} onChange={(e) => setBloodLoss(e.target.value)} placeholder="Ninguna" className={`mt-0.5 text-sm ${INPUT_DARK}`} /></div>
              <div><Label className={`${LABEL_DARK} text-sm`}>Vía aérea</Label><Input value={airwayStatus} onChange={(e) => setAirwayStatus(e.target.value)} placeholder="Permeable" className={`mt-0.5 text-sm ${INPUT_DARK}`} /></div>
              <div><Label className={`${LABEL_DARK} text-sm`}>FR (rpm)</Label><Input type="number" min={0} max={60} value={respirationRate} onChange={(e) => setRespirationRate(e.target.value)} placeholder="16" className={`mt-0.5 text-sm ${INPUT_DARK}`} /></div>
              <div><Label className={`${LABEL_DARK} text-sm`}>Pulso (lpm)</Label><Input type="number" min={0} max={300} value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="72" className={`mt-0.5 text-sm ${INPUT_DARK}`} /></div>
              <div><Label className={`${LABEL_DARK} text-sm`}>TA sist.</Label><Input type="number" value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} placeholder="120" className={`mt-0.5 text-sm ${INPUT_DARK}`} /></div>
              <div><Label className={`${LABEL_DARK} text-sm`}>TA diast.</Label><Input type="number" value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} placeholder="80" className={`mt-0.5 text-sm ${INPUT_DARK}`} /></div>
              <div className="col-span-2"><Label className={`${LABEL_DARK} text-sm`}>SpO₂ (%)</Label><Input type="number" min={0} max={100} value={saturacionOxigeno} onChange={(e) => setSaturacionOxigeno(e.target.value)} placeholder="98" className={`mt-0.5 text-sm ${INPUT_DARK}`} /></div>
            </CardContent>
          </Card>
        );
      case 8:
        return (
          <Card className={CARD_DARK} style={CARD_DARK_STYLE}>
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm text-slate-100">Glasgow</CardTitle>
              <p className="text-[10px] text-slate-400">Ocular, Verbal, Motor</p>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 p-2 pt-1">
              <div><Label className={LABEL_DARK}>E</Label><Select value={glasgowE ? String(glasgowE) : "0"} onValueChange={(v) => setGlasgowE(Number(v))}><SelectTrigger className={`mt-0.5 ${INPUT_DARK} min-h-[40px] [&>span]:text-slate-100 [&>span]:text-sm`}><SelectValue placeholder="—" /></SelectTrigger><SelectContent className="border-slate-600 bg-slate-800 text-slate-100">{GLASGOW_OCULAR.map((o) => <SelectItem key={o.value} value={String(o.value)} className="focus:bg-slate-700 focus:text-slate-100 text-sm">{o.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className={LABEL_DARK}>V</Label><Select value={glasgowV ? String(glasgowV) : "0"} onValueChange={(v) => setGlasgowV(Number(v))}><SelectTrigger className={`mt-0.5 ${INPUT_DARK} min-h-[40px] [&>span]:text-slate-100 [&>span]:text-sm`}><SelectValue placeholder="—" /></SelectTrigger><SelectContent className="border-slate-600 bg-slate-800 text-slate-100">{GLASGOW_VERBAL.map((o) => <SelectItem key={o.value} value={String(o.value)} className="focus:bg-slate-700 focus:text-slate-100 text-sm">{o.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className={LABEL_DARK}>M</Label><Select value={glasgowM ? String(glasgowM) : "0"} onValueChange={(v) => setGlasgowM(Number(v))}><SelectTrigger className={`mt-0.5 ${INPUT_DARK} min-h-[40px] [&>span]:text-slate-100 [&>span]:text-sm`}><SelectValue placeholder="—" /></SelectTrigger><SelectContent className="border-slate-600 bg-slate-800 text-slate-100">{GLASGOW_MOTOR.map((o) => <SelectItem key={o.value} value={String(o.value)} className="focus:bg-slate-700 focus:text-slate-100 text-sm">{o.label}</SelectItem>)}</SelectContent></Select></div>
              <p className="col-span-3 text-xs text-slate-300 font-medium">Total: {puntajeGlasgow}</p>
            </CardContent>
          </Card>
        );
      case 9:
        return (
          <Card className={CARD_DARK} style={CARD_DARK_STYLE}>
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-sm text-slate-100">Eventos · Cierre</CardTitle>
              <p className="text-[10px] text-slate-400">Use la botonera de arriba para eventos rápidos. Registre «Llegada al Hospital» para habilitar Finalizar.</p>
            </CardHeader>
            <CardContent className="space-y-2 p-2 pt-0">
              <div className="flex gap-2">
                <Input
                  ref={timestampInputRef}
                  value={timestampInput}
                  onChange={(e) => setTimestampInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarTimestamp())}
                  placeholder="Otro evento..."
                  className={`min-h-[44px] flex-1 shrink-0 ${INPUT_DARK} text-sm`}
                  aria-label="Registrar otro evento"
                />
                <Button type="button" onClick={() => agregarTimestamp()} className={`min-h-[44px] shrink-0 rounded-xl border-2 border-slate-600 bg-slate-800 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-700 ${pulseButtonKey === "_custom" ? "animate-button-flash" : ""}`}>
                  Registrar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      case 10:
        return (
          <Card className={CARD_DARK} style={CARD_DARK_STYLE}>
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm text-slate-100">Paciente</CardTitle>
              <p className="text-[10px] text-slate-400">Datos y diagnóstico CIE-11</p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 p-2 pt-1">
              <div><Label htmlFor="paciente_id" className={`${LABEL_DARK} text-sm`}>ID / Historia</Label><Input id="paciente_id" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} placeholder="Obligatorio" className={`mt-0.5 text-sm ${INPUT_DARK}`} /></div>
              <div><Label htmlFor="nombre_paciente" className={`${LABEL_DARK} text-sm`}>Nombre</Label><Input id="nombre_paciente" value={nombrePaciente} onChange={(e) => setNombrePaciente(e.target.value)} className={`mt-0.5 text-sm ${INPUT_DARK}`} /></div>
              <div><Label htmlFor="dni" className={`${LABEL_DARK} text-sm`}>DNI</Label><Input id="dni" value={dni} onChange={(e) => setDni(e.target.value)} className={`mt-0.5 text-sm ${INPUT_DARK}`} /></div>
              <div className="col-span-2"><Label htmlFor="sintomas" className={`${LABEL_DARK} text-sm`}>Motivo / Observaciones</Label><Input id="sintomas" value={sintomasTexto} onChange={(e) => setSintomasTexto(e.target.value)} placeholder="Motivo de atención" className={`mt-0.5 text-sm ${INPUT_DARK}`} /></div>
              <div className="col-span-2">
                <Label htmlFor="diagnostico-presuntivo" className={LABEL_DARK}>Diagnóstico presuntivo <span className="text-amber-400">*</span></Label>
                <DiagnosticoAutocomplete value={diagnosticoPresuntivo} onChange={setDiagnosticoPresuntivo} placeholder="Buscar (Infarto, ACV…)" className="mt-0.5" required />
              </div>
            </CardContent>
          </Card>
        );
      case 11: {
        if (atencionFinalizada) {
          return (
            <Card className={CARD_DARK} style={CARD_DARK_STYLE}>
              <CardHeader className="p-2 pb-0">
                <CardTitle className="text-base text-slate-100">Atención finalizada</CardTitle>
                <p className="text-xs text-slate-400">Datos en central. Opcional: compartir o descargar PDF.</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 p-2 pt-0">
                <Button type="button" onClick={handleCompartirPDF} disabled={compartirPdfLoading} className="min-h-[40px] w-full rounded-lg border-2 border-slate-500 bg-slate-700/80 text-sm text-slate-100 hover:bg-slate-600 disabled:opacity-60">
                  {compartirPdfLoading ? "Generando…" : canUseShare() ? "Compartir PDF" : "Descargar PDF"}
                </Button>
                <Button type="button" onClick={handleNuevaAtencionClick} className={`min-h-[44px] w-full text-sm ${BTN_GRADIENT}`} style={BTN_GRADIENT_STYLE}>
                  NUEVA ATENCIÓN
                </Button>
              </CardContent>
            </Card>
          );
        }
        const faltantes: string[] = [];
        if (!horaInicio?.trim()) faltantes.push("Hora de inicio");
        if (!pacienteId?.trim()) faltantes.push("ID / Nº historia");
        if (!nombrePaciente?.trim() && !dni?.trim()) faltantes.push("Nombre o DNI");
        const tieneTA = (bpSystolic?.trim() && bpDiastolic?.trim()) || (Number(bpSystolic) > 0 && Number(bpDiastolic) > 0);
        if (!tieneTA) faltantes.push("Tensión arterial");
        return (
          <Card className={CARD_DARK} style={CARD_DARK_STYLE}>
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm text-slate-100">Finalizar atención</CardTitle>
              <p className="text-xs text-slate-400">Paciente: {pacienteId || "—"} · Inicio: {horaInicio ? new Date(horaInicio).toLocaleTimeString("es-ES") : "—"}</p>
            </CardHeader>
            <CardContent className="p-2 pt-1 space-y-2">
              {syncError && (
                <div className="rounded border border-amber-500/70 bg-amber-500/15 px-2 py-1.5 text-xs text-amber-200">
                  No se pudo enviar. Revise conexión e intente de nuevo.
                </div>
              )}
              {faltantes.length > 0 && (
                <div className="rounded border border-amber-500/70 bg-amber-500/15 px-2 py-1.5 text-xs text-amber-200">
                  <p className="font-medium text-amber-100">Faltan (recomendado):</p>
                  <ul className="mt-0.5 list-inside list-disc text-amber-200/90">{faltantes.map((f, i) => <li key={i}>{f}</li>)}</ul>
                </div>
              )}
              <p className="text-xs text-slate-400">Use el botón <strong className="text-slate-300">FINALIZAR ATENCIÓN</strong> abajo para guardar en central, generar PDF y reiniciar.</p>
            </CardContent>
          </Card>
        );
      }
      default:
        return null;
    }
  };

  const rcpCount = countByEvento("Registro RCP");
  const fabPulsing = pulseButtonKey === "Registro RCP";
  const ultimos3Eventos = timestampEventos.slice(-3).reverse();
  const llegadaHospitalRegistrada = timestampEventos.some((e) => e.evento === EVENTO_CIERRE);
  const puedeFinalizarAtencion = llegadaHospitalRegistrada;

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden"
    >
      <ToastTimestamp message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* Header fijo: indicador de pasos (sin scroll) */}
      <header className="shrink-0 border-b border-slate-700/50 bg-[#1e293b] px-2 pt-1.5 pb-1.5">
        <p className="mb-0.5 text-[10px] font-medium text-slate-400">{progressText}</p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${RED_EMERGENCY} 0%, ${BLUE_MEDICAL} 100%)` }} />
        </div>
      </header>

      {/* Botonera de Mando: grilla táctica + log últimos 3 + Llegada al Hospital (siempre a mano) */}
      <section className="shrink-0 border-b border-slate-700/50 bg-slate-800/60 px-2 py-2" aria-label="Botonera de eventos">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Eventos · Un toque = registro</p>
        <div className="flex gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
            {BOTONES_QUICK_GRID.map((b) => {
              const count = countByEvento(b.label);
              const isPulsing = pulseButtonKey === b.label;
              const isOtro = b.label === "Otro";
              return (
                <div key={b.label} className="relative">
                  {!isOtro && count > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 z-10 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-blue-500 px-0.5 text-[9px] font-bold text-white">
                      {count}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (isOtro) timestampInputRef.current?.focus();
                      else agregarTimestamp(b.label);
                    }}
                    className={`relative min-h-[40px] w-full touch-manipulation rounded-lg border-2 px-1.5 py-1.5 text-[11px] font-semibold transition active:scale-[0.97] ${b.color} ${isPulsing ? "animate-button-flash" : ""}`}
                  >
                    {b.label}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="w-[100px] shrink-0 rounded-lg border border-slate-600 bg-slate-800/80 px-1.5 py-1">
            <p className="mb-0.5 text-[9px] font-medium text-slate-500">Últimos 3</p>
            {ultimos3Eventos.length === 0 ? (
              <p className="text-[10px] text-slate-500">—</p>
            ) : (
              <ul className="space-y-0.5 text-[10px]">
                {ultimos3Eventos.map((ev, i) => (
                  <li key={`${ev.hora}-${i}`} className={`truncate font-mono ${ev.hora === lastAddedHora ? "text-amber-400" : "text-slate-400"}`} title={ev.evento}>
                    {new Date(ev.hora).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} {ev.evento}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => agregarTimestamp(EVENTO_CIERRE)}
          className={`mt-1.5 flex min-h-[40px] w-full items-center justify-center rounded-lg border-2 font-bold transition active:scale-[0.98] ${
            llegadaHospitalRegistrada
              ? "border-emerald-500 bg-emerald-600/80 text-white"
              : "border-amber-500 bg-amber-500/90 text-zinc-900 hover:bg-amber-400"
          } ${pulseButtonKey === EVENTO_CIERRE ? "animate-button-flash" : ""}`}
        >
          {llegadaHospitalRegistrada ? "✓ Llegada al Hospital registrada" : "Llegada al Hospital (habilita Finalizar)"}
        </button>
      </section>

      {/* Cuerpo central: ÚNICO elemento con scroll; pb-32 para no quedar tapado por el footer fijo */}
      <div
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-32 ${currentStep === 9 ? "pr-14" : ""}`}
      >
        <div className="pt-2">{renderStepContent()}</div>
      </div>

      {/* Barra de navegación anclada al viewport (fixed); RCP flotante encima */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900 p-4">
        {/* FAB RCP: justo encima de la barra */}
        <div
          className="absolute bottom-[calc(100%+1rem)] right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition active:scale-95"
          style={{
            backgroundColor: "rgba(220, 38, 38, 0.95)",
            border: "2px solid rgba(255,255,255,0.2)",
          }}
        >
          {rcpCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 z-10 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white" aria-label={`RCP ${rcpCount}`}>
              {rcpCount}
            </span>
          )}
          <button
            type="button"
            onClick={() => agregarTimestamp("Registro RCP")}
            className={`absolute inset-0 flex items-center justify-center rounded-full text-[10px] font-bold uppercase text-white hover:bg-red-500/90 ${fabPulsing ? "animate-button-flash" : ""}`}
            aria-label="Registrar RCP"
          >
            RCP
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={goBack}
            disabled={currentStep === 0}
            className="min-h-[44px] flex-1 touch-manipulation rounded-lg border-2 text-sm font-semibold text-slate-100 transition active:scale-[0.98] disabled:opacity-40"
            style={{ borderColor: "rgba(37, 99, 235, 0.5)", backgroundColor: "rgba(15, 23, 42, 0.95)" }}
          >
            ANTERIOR
          </Button>
          {currentStep < TOTAL_STEPS - 1 ? (
            <Button type="button" onClick={goNext} className={`min-h-[44px] flex-1 text-sm text-white ${BTN_GRADIENT} ${isGlasgowStepComplete ? "opacity-95" : ""}`} style={BTN_GRADIENT_STYLE}>
              SIGUIENTE
            </Button>
          ) : atencionFinalizada ? (
            <Button type="button" onClick={handleNuevaAtencionClick} className={`min-h-[44px] flex-1 text-sm font-semibold text-white ${BTN_GRADIENT}`} style={BTN_GRADIENT_STYLE}>
              NUEVA ATENCIÓN
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleFinalizarAtencion}
              disabled={finalizando || !puedeFinalizarAtencion}
              title={!puedeFinalizarAtencion ? "Registre «Llegada al Hospital» en la botonera para habilitar" : undefined}
              className={`min-h-[44px] flex-1 text-sm font-semibold text-white ${BTN_GRADIENT} disabled:opacity-70`}
              style={BTN_GRADIENT_STYLE}
            >
              {finalizando ? "Guardando…" : puedeFinalizarAtencion ? "FINALIZAR ATENCIÓN" : "Finalizar (registre Llegada)"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
