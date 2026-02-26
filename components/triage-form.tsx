"use client";

/**
 * Formulario de triaje: rejilla de síntomas seleccionables (chips) y envío a la IA.
 */
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SignosVitales } from "@/lib/types";

/** Iconos SVG inline (sin dependencia externa) para cada síntoma. */
const IconoSintoma = ({ tipo }: { tipo: string }) => {
  const className = "h-5 w-5 shrink-0 text-slate-500";
  switch (tipo) {
    case "fiebre-alta":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></svg>
      );
    case "dificultad-respiratoria":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2 2 0 1 1 19 4H2m0 14h2" /></svg>
      );
    case "dolor-cabeza-intenso":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.4 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.4 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" /></svg>
      );
    case "nauseas-vomitos":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20 5-10 5 10" /><path d="M4 17h14" /><path d="M8 12h8" /></svg>
      );
    case "palpitaciones":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
      );
    case "sangrado":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /></svg>
      );
    case "dolor-muscular":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6" /><path d="M4 10h16" /><path d="M4 6h12" /><path d="M6 18h12" /><path d="M8 22h8" /></svg>
      );
    default:
      return null;
  }
};

/** Opciones de síntomas como chips seleccionables (con icono). */
const SINTOMAS_OPCIONES: { id: string; label: string; emoji: string }[] = [
  { id: "fiebre-alta", label: "Fiebre Alta", emoji: "🤒" },
  { id: "dificultad-respiratoria", label: "Dificultad Respiratoria", emoji: "🫁" },
  { id: "dolor-cabeza-intenso", label: "Dolor de Cabeza Intenso", emoji: "🤕" },
  { id: "nauseas-vomitos", label: "Náuseas/Vómitos", emoji: "🤢" },
  { id: "palpitaciones", label: "Palpitaciones", emoji: "💓" },
  { id: "sangrado", label: "Sangrado", emoji: "🩸" },
  { id: "dolor-muscular", label: "Dolor Muscular", emoji: "🦵" },
  { id: "reaccion-alergica", label: "Reacción Alérgica / Ronchas", emoji: "🔴" },
  { id: "picazon-prurito", label: "Picazón / Prurito", emoji: "🦟" },
  { id: "dolor-articular", label: "Dolor Articular", emoji: "🦴" },
  { id: "deshidratacion", label: "Deshidratación", emoji: "💧" },
  { id: "presion-baja", label: "Presión Baja", emoji: "📉" },
  { id: "confusion-desorientacion", label: "Confusión / Desorientación", emoji: "🧠" },
];

/** Escala de Glasgow: opciones por categoría. */
const GLASGOW_OCULAR: { valor: number; label: string }[] = [
  { valor: 4, label: "Espontánea" },
  { valor: 3, label: "Al estímulo verbal" },
  { valor: 2, label: "Al dolor" },
  { valor: 1, label: "Ninguna" },
];
const GLASGOW_VERBAL: { valor: number; label: string }[] = [
  { valor: 5, label: "Orientado" },
  { valor: 4, label: "Confuso" },
  { valor: 3, label: "Palabras inapropiadas" },
  { valor: 2, label: "Sonidos incomprensibles" },
  { valor: 1, label: "Ninguna" },
];
const GLASGOW_MOTOR: { valor: number; label: string }[] = [
  { valor: 6, label: "Obedece órdenes" },
  { valor: 5, label: "Localiza el dolor" },
  { valor: 4, label: "Retirada al dolor" },
  { valor: 3, label: "Flexión anormal" },
  { valor: 2, label: "Extensión anormal" },
  { valor: 1, label: "Ninguna" },
];

/** Payload del formulario de entrada; coincide con POST /api/triage. */
export interface FormularioEntrada {
  paciente_id: string;
  sintomas_texto: string;
  /** Nombre del paciente (opcional, para historial). */
  nombre_paciente?: string;
  /** DNI del paciente (opcional, para historial). */
  dni?: string;
  signos_vitales?: SignosVitales;
  /** Escala de Glasgow (E, V, M) si se ha evaluado. */
  glasgow?: { E: number; V: number; M: number; puntaje_glasgow: number };
}

export interface TriageFormProps {
  onSubmit: (data: FormularioEntrada) => void;
  isSubmitting?: boolean;
}

export function TriageForm({ onSubmit, isSubmitting = false }: TriageFormProps): React.ReactElement {
  const [pacienteId, setPacienteId] = React.useState("");
  const [nombrePaciente, setNombrePaciente] = React.useState("");
  const [dni, setDni] = React.useState("");
  const [seleccionados, setSeleccionados] = React.useState<Set<string>>(new Set());
  const [showSignos, setShowSignos] = React.useState(false);
  const [signos, setSignos] = React.useState<SignosVitales>({});
  const [glasgowE, setGlasgowE] = React.useState<number>(0);
  const [glasgowV, setGlasgowV] = React.useState<number>(0);
  const [glasgowM, setGlasgowM] = React.useState<number>(0);

  const toggleSintoma = (id: string): void => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sintomasTexto = React.useMemo(
    () =>
      SINTOMAS_OPCIONES.filter((s) => seleccionados.has(s.id))
        .map((s) => s.label)
        .join(", "),
    [seleccionados]
  );
  const haySintomas = seleccionados.size > 0;

  const puntajeGlasgow = glasgowE + glasgowV + glasgowM;
  const glasgowCompleto = glasgowE > 0 && glasgowV > 0 && glasgowM > 0;
  const alertaTraumaGrave = glasgowCompleto && puntajeGlasgow <= 8;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!haySintomas) return;
    const payload: FormularioEntrada = {
      paciente_id: pacienteId.trim(),
      sintomas_texto: sintomasTexto,
      signos_vitales: Object.keys(signos).length > 0 ? signos : undefined,
      glasgow:
        glasgowCompleto
          ? { E: glasgowE, V: glasgowV, M: glasgowM, puntaje_glasgow: puntajeGlasgow }
          : undefined,
    };
    if (nombrePaciente.trim()) payload.nombre_paciente = nombrePaciente.trim();
    if (dni.trim()) payload.dni = dni.trim();
    onSubmit(payload);
  };

  const updateSigno = <K extends keyof SignosVitales>(key: K, value: SignosVitales[K]): void => {
    setSignos((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="border-slate-200/80 bg-white shadow-md">
        <CardHeader className="border-b border-slate-100 bg-slate-50/30 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--medical-slate-blue)] text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
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
              <CardTitle className="font-sans text-slate-800">Registro de triaje</CardTitle>
              <CardDescription className="font-sans text-slate-600">
                Seleccione los síntomas del paciente. Puede elegir varios.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="paciente_id" className="font-sans text-slate-700">
                ID de paciente
              </Label>
              <Input
                id="paciente_id"
                placeholder="Ej: P-2024-001"
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value)}
                required
                className="border-slate-200 bg-white font-sans"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nombre_paciente" className="font-sans text-slate-700">
                Nombre del paciente <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="nombre_paciente"
                placeholder="Ej: María García"
                value={nombrePaciente}
                onChange={(e) => setNombrePaciente(e.target.value)}
                className="border-slate-200 bg-white font-sans"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dni" className="font-sans text-slate-700">
                DNI <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="dni"
                placeholder="Ej: 12345678A"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                className="border-slate-200 bg-white font-sans"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-sans text-slate-700">Síntomas</Label>
            <div
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              role="group"
              aria-label="Seleccione los síntomas presentes"
            >
              {SINTOMAS_OPCIONES.map((s) => {
                const selected = seleccionados.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSintoma(s.id)}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left font-sans text-sm transition-all duration-200 ease-out hover:scale-[1.03] ${
                      selected
                        ? "border-[var(--medical-slate-blue)] bg-sky-100 text-slate-800 shadow-sm"
                        : "border-slate-200 bg-slate-50/80 text-slate-600 hover:border-sky-300 hover:bg-sky-50/80"
                    }`}
                  >
                    <span className="text-xl" aria-hidden>
                      {s.emoji}
                    </span>
                    <IconoSintoma tipo={s.id} />
                    <span className="font-medium">{s.label}</span>
                  </button>
                );
              })}
            </div>
            {!haySintomas && (
              <p className="text-sm text-slate-500">
                Seleccione al menos un síntoma para poder evaluar.
              </p>
            )}
          </div>

          {/* Evaluación Neurológica (Escala de Glasgow) */}
          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-5 shadow-sm">
            <h3 className="mb-1 font-sans text-base font-semibold text-slate-800">
              Evaluación Neurológica (Escala de Glasgow)
            </h3>
            <p className="mb-4 text-sm text-slate-600">
              Seleccione una opción en cada categoría. El total se calcula en tiempo real.
            </p>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Respuesta Ocular (E, 1-4)
                </p>
                <div className="flex flex-wrap gap-2">
                  {GLASGOW_OCULAR.map((op) => (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => setGlasgowE(op.valor)}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all duration-200 ${
                        glasgowE === op.valor
                          ? "border-[var(--medical-slate-blue)] bg-sky-200/80 text-slate-900"
                          : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-100/80"
                      }`}
                    >
                      {op.valor}. {op.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Respuesta Verbal (V, 1-5)
                </p>
                <div className="flex flex-wrap gap-2">
                  {GLASGOW_VERBAL.map((op) => (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => setGlasgowV(op.valor)}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all duration-200 ${
                        glasgowV === op.valor
                          ? "border-[var(--medical-slate-blue)] bg-sky-200/80 text-slate-900"
                          : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-100/80"
                      }`}
                    >
                      {op.valor}. {op.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Respuesta Motora (M, 1-6)
                </p>
                <div className="flex flex-wrap gap-2">
                  {GLASGOW_MOTOR.map((op) => (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => setGlasgowM(op.valor)}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all duration-200 ${
                        glasgowM === op.valor
                          ? "border-[var(--medical-slate-blue)] bg-sky-200/80 text-slate-900"
                          : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-100/80"
                      }`}
                    >
                      {op.valor}. {op.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-600">Total Glasgow:</span>
              <span
                className={`inline-flex items-center rounded-full px-4 py-1.5 text-lg font-bold ${
                  glasgowCompleto
                    ? alertaTraumaGrave
                      ? "bg-red-100 text-red-800 ring-2 ring-red-400"
                      : "bg-[var(--medical-slate-blue)] text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {glasgowCompleto ? `${puntajeGlasgow} (E=${glasgowE} V=${glasgowV} M=${glasgowM})` : "—"}
              </span>
              {alertaTraumaGrave && (
                <span className="rounded-lg border-2 border-red-400 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800">
                  ¡Alerta: Trauma Grave!
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowSignos(!showSignos)}
              className="text-sm font-medium text-[var(--medical-slate-blue)] hover:underline"
            >
              {showSignos ? "Ocultar signos vitales" : "+ Añadir signos vitales (opcional)"}
            </button>
            {showSignos && (
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="fc" className="text-slate-600">Frec. cardíaca (lpm)</Label>
                  <Input
                    id="fc"
                    type="number"
                    min={30}
                    max={250}
                    placeholder="60-100"
                    value={signos.frecuenciaCardiaca ?? ""}
                    onChange={(e) =>
                      updateSigno(
                        "frecuenciaCardiaca",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="border-slate-200 bg-white"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="temp" className="text-slate-600">Temperatura (°C)</Label>
                  <Input
                    id="temp"
                    type="number"
                    step={0.1}
                    min={32}
                    max={43}
                    placeholder="36.5"
                    value={signos.temperatura ?? ""}
                    onChange={(e) =>
                      updateSigno(
                        "temperatura",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="border-slate-200 bg-white"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="spo2" className="text-slate-600">SpO₂ (%)</Label>
                  <Input
                    id="spo2"
                    type="number"
                    min={70}
                    max={100}
                    placeholder="98"
                    value={signos.saturacionOxigeno ?? ""}
                    onChange={(e) =>
                      updateSigno(
                        "saturacionOxigeno",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="border-slate-200 bg-white"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ta" className="text-slate-600">Tensión arterial</Label>
                  <Input
                    id="ta"
                    placeholder="120/80"
                    value={signos.tensionArterial ?? ""}
                    onChange={(e) =>
                      updateSigno("tensionArterial", e.target.value || undefined)
                    }
                    className="border-slate-200 bg-white"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="fr" className="text-slate-600">Frec. respiratoria (/min)</Label>
                  <Input
                    id="fr"
                    type="number"
                    min={8}
                    max={60}
                    placeholder="12-20"
                    value={signos.frecuenciaRespiratoria ?? ""}
                    onChange={(e) =>
                      updateSigno(
                        "frecuenciaRespiratoria",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="border-slate-200 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !haySintomas}
              size="lg"
              className="bg-[var(--medical-slate-blue)] font-sans hover:opacity-90"
            >
              {isSubmitting ? "Evaluando…" : "Evaluar triaje"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
