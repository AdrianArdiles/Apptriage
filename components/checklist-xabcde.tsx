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
import {
  loadFichaClinica,
  saveFichaClinica,
  type FichaClinicaPersistida,
  type TimestampEvento,
} from "@/lib/ficha-clinica-storage";

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
}

function formatHora(date: Date): string {
  return date.toISOString();
}

export interface ChecklistXABCDEProps {
  onSubmit: (data: DatosEvaluacionInicial) => void;
  isSubmitting?: boolean;
}

const CARD_DARK = "border-zinc-700 bg-zinc-800/80 text-zinc-100";
const INPUT_DARK = "min-h-[44px] border-zinc-600 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:ring-emerald-500";
const LABEL_DARK = "text-zinc-300";

export function ChecklistXABCDE({ onSubmit, isSubmitting = false }: ChecklistXABCDEProps): React.ReactElement {
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

  const persistRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, []);

  React.useEffect(() => {
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = setTimeout(persist, 400);
    return () => {
      if (persistRef.current) clearTimeout(persistRef.current);
    };
  }, [persist]);

  const registrarInicio = React.useCallback(() => {
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

  const agregarTimestamp = (eventoLabel?: string) => {
    const evento = eventoLabel ?? timestampInput.trim() || "Evento";
    setTimestampEventos((prev) => [...prev, { evento, hora: formatHora(new Date()) }]);
    if (!eventoLabel) setTimestampInput("");
  };

  /** Botones rápidos de tiempos: etiqueta y clase de color (min 44px). */
  const BOTONES_TIMESTAMP = [
    { label: "Salida/Llegada Escena", color: "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white" },
    { label: "Adrenalina", color: "bg-red-600 hover:bg-red-500 border-red-500 text-white" },
    { label: "Descarga DEA", color: "bg-blue-600 hover:bg-blue-500 border-blue-500 text-white" },
    { label: "Llegada Hosp.", color: "bg-amber-500 hover:bg-amber-400 border-amber-400 text-zinc-900" },
  ] as const;

  const puntajeGlasgow = glasgowE + glasgowV + glasgowM;
  const glasgowCompleto = glasgowE > 0 && glasgowV > 0 && glasgowM > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className={CARD_DARK}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-zinc-100">Hora de inicio de atención</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              readOnly
              value={horaInicio || "—"}
              className={`max-w-xs font-mono text-sm ${INPUT_DARK}`}
              aria-label="Hora de inicio"
            />
            {!inicioRegistrado && (
              <Button type="button" onClick={registrarInicio} size="lg" className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700">
                Iniciar atención
              </Button>
            )}
            {inicioRegistrado && (
              <span className="text-sm font-medium text-emerald-400">Registrada</span>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card className={CARD_DARK}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-zinc-100">Evaluación XABCDE</CardTitle>
          <p className="text-sm text-zinc-400">Toque cada ítem: Pendiente → OK → No aplica (mín. 44px)</p>
        </CardHeader>
        <CardContent className="grid gap-3">
          {XABCDE_ITEMS.map(({ letra, titulo, descripcion }) => (
            <button
              key={letra}
              type="button"
              onClick={() => toggleXABCDE(letra)}
              className={`flex min-h-[44px] touch-manipulation items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition active:scale-[0.98] ${colorEstado(xabcde[letra] ?? "pendiente")}`}
            >
              <span className="text-xl font-bold">{letra}</span>
              <div>
                <p className="font-semibold">{titulo}</p>
                <p className="text-xs opacity-90">{descripcion}</p>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className={CARD_DARK}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-zinc-100">Signos vitales y datos clínicos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="blood_loss" className={LABEL_DARK}>Pérdida de sangre (blood_loss)</Label>
            <Input
              id="blood_loss"
              value={bloodLoss}
              onChange={(e) => setBloodLoss(e.target.value)}
              placeholder="ej. Ninguna / Moderada"
              className={INPUT_DARK}
            />
          </div>
          <div>
            <Label htmlFor="airway" className={LABEL_DARK}>Estado vía aérea (airway_status)</Label>
            <Input
              id="airway"
              value={airwayStatus}
              onChange={(e) => setAirwayStatus(e.target.value)}
              placeholder="ej. Permeable"
              className={INPUT_DARK}
            />
          </div>
          <div>
            <Label htmlFor="respiration_rate" className={LABEL_DARK}>Frec. respiratoria (rpm)</Label>
            <Input
              id="respiration_rate"
              type="number"
              min={0}
              max={60}
              placeholder="ej. 16"
              value={respirationRate}
              onChange={(e) => setRespirationRate(e.target.value)}
              className={INPUT_DARK}
            />
          </div>
          <div>
            <Label htmlFor="pulse" className={LABEL_DARK}>Pulso (lpm)</Label>
            <Input
              id="pulse"
              type="number"
              min={0}
              max={300}
              placeholder="ej. 72"
              value={pulse}
              onChange={(e) => setPulse(e.target.value)}
              className={INPUT_DARK}
            />
          </div>
          <div>
            <Label htmlFor="bp_sys" className={LABEL_DARK}>TA sistólica (mmHg)</Label>
            <Input
              id="bp_sys"
              type="number"
              min={0}
              max={300}
              placeholder="120"
              value={bpSystolic}
              onChange={(e) => setBpSystolic(e.target.value)}
              className={INPUT_DARK}
            />
          </div>
          <div>
            <Label htmlFor="bp_dia" className={LABEL_DARK}>TA diastólica (mmHg)</Label>
            <Input
              id="bp_dia"
              type="number"
              min={0}
              max={200}
              placeholder="80"
              value={bpDiastolic}
              onChange={(e) => setBpDiastolic(e.target.value)}
              className={INPUT_DARK}
            />
          </div>
          <div>
            <Label htmlFor="spo2" className={LABEL_DARK}>Saturación O₂ (%)</Label>
            <Input
              id="spo2"
              type="number"
              min={0}
              max={100}
              placeholder="98"
              value={saturacionOxigeno}
              onChange={(e) => setSaturacionOxigeno(e.target.value)}
              className={INPUT_DARK}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={CARD_DARK}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-zinc-100">Escala de Glasgow (simplificada)</CardTitle>
          <p className="text-sm text-zinc-400">Seleccione Ocular, Verbal y Motor — el puntaje se calcula solo</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className={LABEL_DARK}>Ocular (E)</Label>
            <Select value={glasgowE ? String(glasgowE) : "0"} onValueChange={(v) => setGlasgowE(Number(v))}>
              <SelectTrigger className={`mt-1 ${INPUT_DARK} min-h-[44px] [&>span]:text-zinc-100`}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent className="border-zinc-600 bg-zinc-800 text-zinc-100">
                {GLASGOW_OCULAR.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)} className="focus:bg-zinc-700 focus:text-zinc-100">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={LABEL_DARK}>Verbal (V)</Label>
            <Select value={glasgowV ? String(glasgowV) : "0"} onValueChange={(v) => setGlasgowV(Number(v))}>
              <SelectTrigger className={`mt-1 ${INPUT_DARK} min-h-[44px] [&>span]:text-zinc-100`}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent className="border-zinc-600 bg-zinc-800 text-zinc-100">
                {GLASGOW_VERBAL.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)} className="focus:bg-zinc-700 focus:text-zinc-100">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={LABEL_DARK}>Motor (M)</Label>
            <Select value={glasgowM ? String(glasgowM) : "0"} onValueChange={(v) => setGlasgowM(Number(v))}>
              <SelectTrigger className={`mt-1 ${INPUT_DARK} min-h-[44px] [&>span]:text-zinc-100`}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent className="border-zinc-600 bg-zinc-800 text-zinc-100">
                {GLASGOW_MOTOR.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)} className="focus:bg-zinc-700 focus:text-zinc-100">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="sm:col-span-3 text-zinc-300 font-medium">Puntaje Glasgow total: {puntajeGlasgow}</p>
        </CardContent>
      </Card>

      <Card className={CARD_DARK}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-zinc-100">Módulo de Tiempos (Timestamps)</CardTitle>
          <p className="text-sm text-zinc-400">Toque un botón para registrar la hora exacta. Se guarda en este dispositivo.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {BOTONES_TIMESTAMP.map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => agregarTimestamp(b.label)}
                className={`min-h-[44px] touch-manipulation rounded-xl border-2 px-3 py-2 text-sm font-medium transition active:scale-[0.98] ${b.color}`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input
              value={timestampInput}
              onChange={(e) => setTimestampInput(e.target.value)}
              placeholder="Otro evento (opcional)"
              className={`flex-1 min-w-[140px] ${INPUT_DARK}`}
            />
            <Button
              type="button"
              onClick={() => agregarTimestamp()}
              className="min-h-[44px] bg-zinc-600 hover:bg-zinc-500 text-zinc-100"
            >
              Registrar hora
            </Button>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Historial de Tiempos</p>
            {timestampEventos.length === 0 ? (
              <p className="rounded-lg bg-zinc-700/40 px-3 py-2 text-sm text-zinc-500">Sin eventos registrados</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {timestampEventos.map((ev, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-zinc-700/50 px-3 py-2 text-zinc-200">
                    <span className="font-mono text-zinc-400">{new Date(ev.hora).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-zinc-300">—</span>
                    <span>{ev.evento}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={CARD_DARK}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-zinc-100">Paciente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="paciente_id" className={LABEL_DARK}>ID / Nº historia</Label>
            <Input
              id="paciente_id"
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
              placeholder="Obligatorio"
              className={INPUT_DARK}
            />
          </div>
          <div>
            <Label htmlFor="nombre_paciente" className={LABEL_DARK}>Nombre</Label>
            <Input
              id="nombre_paciente"
              value={nombrePaciente}
              onChange={(e) => setNombrePaciente(e.target.value)}
              className={INPUT_DARK}
            />
          </div>
          <div>
            <Label htmlFor="dni" className={LABEL_DARK}>DNI</Label>
            <Input
              id="dni"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className={INPUT_DARK}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="sintomas" className={LABEL_DARK}>Observaciones / Motivo</Label>
            <Input
              id="sintomas"
              value={sintomasTexto}
              onChange={(e) => setSintomasTexto(e.target.value)}
              placeholder="Breve descripción del motivo de atención"
              className={INPUT_DARK}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        size="lg"
        className="w-full min-h-[44px] text-base bg-emerald-600 hover:bg-emerald-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Enviando…" : "Enviar a Vercel"}
      </Button>
    </form>
  );
}
