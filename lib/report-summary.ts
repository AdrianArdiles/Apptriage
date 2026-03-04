import type { SignosVitales } from "@/lib/types";
import type { DiagnosticoCIE } from "@/lib/diagnosticos-emergencias";

/** Datos necesarios para generar el resumen (misma forma que DatosEvaluacionInicial). */
export interface ReportSummaryData {
  hora_inicio_atencion?: string;
  paciente_id?: string;
  nombre_paciente?: string;
  dni?: string;
  sintomas_texto?: string;
  xabcde?: Record<string, string>;
  signos_vitales?: SignosVitales;
  glasgow?: { E: number; V: number; M: number; puntaje_glasgow: number };
  glasgow_score?: number;
  blood_loss?: string;
  airway_status?: string;
  respiration_rate?: number;
  pulse?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  timestamp_eventos?: { evento: string; hora: string }[];
  /** Diagnóstico presuntivo con CIE-11 (código y descripción en PDF/Firebase). */
  diagnostico?: DiagnosticoCIE;
  /** Para triaje: impresión clínica en formato PDF "Impresión Clínica: X (CIE-11: Y)". */
  impresion_clinica?: { nombre: string; cie11: string };
  /** Nivel de triaje 1-5 (5 = Rojo). Para banda de gravedad en el PDF. */
  nivel_gravedad?: number;
}

const SEP = "\n";
const LINE = "────────────────────────────────────────";

/**
 * Genera un texto formateado con todos los datos del paciente (XABCDE, Glasgow, Tiempos)
 * listo para ser convertido a PDF más adelante.
 */
export function generateReportSummary(data: ReportSummaryData): string {
  const sections: string[] = [];

  sections.push("FICHA CLÍNICA — AMBULANCIA PRO");
  sections.push(LINE);
  sections.push("");

  sections.push("PACIENTE");
  sections.push(LINE);
  sections.push(`ID / Nº historia: ${data.paciente_id || "—"}`);
  sections.push(`Nombre: ${data.nombre_paciente?.trim() || "—"}`);
  sections.push(`DNI: ${data.dni?.trim() || "—"}`);
  sections.push(`Observaciones: ${data.sintomas_texto?.trim() || "—"}`);
  sections.push("");

  sections.push("HORA DE INICIO DE ATENCIÓN");
  sections.push(LINE);
  sections.push(data.hora_inicio_atencion ? new Date(data.hora_inicio_atencion).toLocaleString("es-ES") : "—");
  sections.push("");

  sections.push("EVALUACIÓN XABCDE");
  sections.push(LINE);
  const xabcdeItems = [
    { letra: "X", titulo: "eXanguinación" },
    { letra: "A", titulo: "Vía aérea" },
    { letra: "B", titulo: "Respiración" },
    { letra: "C", titulo: "Circulación" },
    { letra: "D", titulo: "Discapacidad" },
    { letra: "E", titulo: "Exposición" },
  ];
  for (const item of xabcdeItems) {
    const estado = data.xabcde?.[item.letra] ?? "pendiente";
    sections.push(`  ${item.letra} - ${item.titulo}: ${estado.toUpperCase()}`);
  }
  sections.push("");

  sections.push("SIGNOS VITALES Y DATOS CLÍNICOS");
  sections.push(LINE);
  const sv = data.signos_vitales ?? {};
  sections.push(`  Tensión arterial: ${sv.tensionArterial ?? (data.bp_systolic != null && data.bp_diastolic != null ? `${data.bp_systolic}/${data.bp_diastolic}` : "—")}`);
  sections.push(`  Frecuencia cardíaca / Pulso: ${sv.frecuenciaCardiaca ?? data.pulse ?? "—"} lpm`);
  sections.push(`  Saturación O₂: ${sv.saturacionOxigeno ?? "—"} %`);
  sections.push(`  Frecuencia respiratoria: ${sv.frecuenciaRespiratoria ?? data.respiration_rate ?? "—"} /min`);
  sections.push(`  Pérdida de sangre: ${data.blood_loss ?? "—"}`);
  sections.push(`  Estado vía aérea: ${data.airway_status ?? "—"}`);
  sections.push("");

  if (data.diagnostico) {
    sections.push("DIAGNÓSTICO PRESUNTIVO (CIE-11)");
    sections.push(LINE);
    sections.push(`  Término: ${data.diagnostico.termino_comun}`);
    sections.push(`  Código CIE-11: ${data.diagnostico.codigo_cie}`);
    sections.push(`  Descripción: ${data.diagnostico.descripcion_tecnica}`);
    sections.push("");
  }

  sections.push("ESCALA DE GLASGOW");
  sections.push(LINE);
  if (data.glasgow) {
    sections.push(`  Ocular (E): ${data.glasgow.E}  |  Verbal (V): ${data.glasgow.V}  |  Motor (M): ${data.glasgow.M}`);
    sections.push(`  Puntaje total: ${data.glasgow.puntaje_glasgow}`);
  } else {
    sections.push("  —");
  }
  sections.push("");

  sections.push("EVENTOS REGISTRADOS (TIMESTAMPS)");
  sections.push(LINE);
  const eventos = data.timestamp_eventos ?? [];
  if (eventos.length === 0) {
    sections.push("  Ninguno");
  } else {
    for (const ev of eventos) {
      const hora = new Date(ev.hora).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "medium" });
      sections.push(`  ${hora}  —  ${ev.evento}`);
    }
  }
  sections.push("");

  sections.push(LINE);
  sections.push(`Generado: ${new Date().toLocaleString("es-ES")}`);

  return sections.join(SEP);
}
