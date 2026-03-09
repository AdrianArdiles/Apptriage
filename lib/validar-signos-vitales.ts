import type { SignosVitales } from "@/lib/types";
import type { ReportSummaryData } from "@/lib/report-summary";

/** Rango fisiológico y mensaje de alerta. */
export interface AlertaSignoVital {
  codigo: string;
  mensaje: string;
  valor?: number;
  unidad?: string;
}

export interface ResultadoValidacionSignosVitales {
  valido: boolean;
  alertas: AlertaSignoVital[];
}

// Rangos de referencia (adulto; ajustables por protocolo)
const FC_MIN_NORMAL = 60;
const FC_MAX_NORMAL = 100;
const FC_BRADICARDIA = 60;
const FC_TAQUICARDIA = 100;
const TA_SISTOLICA_HIPOTENSION = 90;
const TA_SISTOLICA_HTA = 180;
const TA_DIASTOLICA_HTA = 110;
const FR_MIN = 8;
const FR_MAX = 24;
const SAT_MIN_NORMAL = 95;
const TEMP_HIPO = 36;
const TEMP_FEBRIL = 38;
const TEMP_HIPERTERMIA = 40;

function parseTA(s: string | undefined): { sys?: number; dia?: number } {
  if (!s || typeof s !== "string") return {};
  const match = s.trim().match(/^(\d+)\s*\/\s*(\d+)$/) || s.trim().match(/^(\d+)-(\d+)$/);
  if (!match) return {};
  const sys = parseInt(match[1], 10);
  const dia = parseInt(match[2], 10);
  if (Number.isNaN(sys) || Number.isNaN(dia)) return {};
  return { sys, dia };
}

/**
 * Extrae valores numéricos de signos vitales desde data (SignosVitales o ReportSummaryData).
 */
function extraerValores(
  data: SignosVitales | ReportSummaryData
): {
  fc?: number;
  taSys?: number;
  taDia?: number;
  fr?: number;
  sat?: number;
  temp?: number;
} {
  const sv = "signos_vitales" in data ? (data as ReportSummaryData).signos_vitales : (data as SignosVitales);
  const report = "bp_systolic" in data ? (data as ReportSummaryData) : null;
  const ta = parseTA(sv?.tensionArterial);
  return {
    fc: sv?.frecuenciaCardiaca ?? report?.pulse ?? undefined,
    taSys: ta.sys ?? report?.bp_systolic ?? undefined,
    taDia: ta.dia ?? report?.bp_diastolic ?? undefined,
    fr: sv?.frecuenciaRespiratoria ?? report?.respiration_rate ?? undefined,
    sat: sv?.saturacionOxigeno ?? undefined,
    temp: sv?.temperatura ?? undefined,
  };
}

/**
 * Valida signos vitales frente a rangos fisiológicos.
 * Devuelve alertas por bradicardia, taquicardia, hipotensión, hipoxemia, etc.
 */
export function validarSignosVitales(
  data: SignosVitales | ReportSummaryData
): ResultadoValidacionSignosVitales {
  const alertas: AlertaSignoVital[] = [];
  const v = extraerValores(data);

  if (v.fc != null && typeof v.fc === "number") {
    if (v.fc < FC_BRADICARDIA)
      alertas.push({
        codigo: "BRADICARDIA",
        mensaje: "Frecuencia cardíaca por debajo del rango normal (bradicardia)",
        valor: v.fc,
        unidad: "lpm",
      });
    if (v.fc > FC_TAQUICARDIA)
      alertas.push({
        codigo: "TAQUICARDIA",
        mensaje: "Frecuencia cardíaca por encima del rango normal (taquicardia)",
        valor: v.fc,
        unidad: "lpm",
      });
    if (v.fc < 30 || v.fc > 250)
      alertas.push({
        codigo: "FC_EXTREMO",
        mensaje: "Frecuencia cardíaca en rango extremo; verificar medición",
        valor: v.fc,
        unidad: "lpm",
      });
  }

  if (v.taSys != null && typeof v.taSys === "number") {
    if (v.taSys < TA_SISTOLICA_HIPOTENSION)
      alertas.push({
        codigo: "HIPOTENSION",
        mensaje: "Tensión arterial sistólica baja (posible hipotensión)",
        valor: v.taSys,
        unidad: "mmHg",
      });
    if (v.taSys > TA_SISTOLICA_HTA)
      alertas.push({
        codigo: "HTA_SISTOLICA",
        mensaje: "Tensión arterial sistólica elevada",
        valor: v.taSys,
        unidad: "mmHg",
      });
  }
  if (v.taDia != null && typeof v.taDia === "number") {
    if (v.taDia > TA_DIASTOLICA_HTA)
      alertas.push({
        codigo: "HTA_DIASTOLICA",
        mensaje: "Tensión arterial diastólica elevada",
        valor: v.taDia,
        unidad: "mmHg",
      });
  }

  if (v.fr != null && typeof v.fr === "number") {
    if (v.fr < FR_MIN)
      alertas.push({
        codigo: "FR_BAJA",
        mensaje: "Frecuencia respiratoria baja",
        valor: v.fr,
        unidad: "/min",
      });
    if (v.fr > FR_MAX)
      alertas.push({
        codigo: "FR_ALTA",
        mensaje: "Frecuencia respiratoria alta (posible taquipnea)",
        valor: v.fr,
        unidad: "/min",
      });
  }

  if (v.sat != null && typeof v.sat === "number") {
    if (v.sat < SAT_MIN_NORMAL)
      alertas.push({
        codigo: "HIPOXEMIA",
        mensaje: "Saturación de oxígeno por debajo de rango normal",
        valor: v.sat,
        unidad: "%",
      });
    if (v.sat < 90)
      alertas.push({
        codigo: "SAT_CRITICA",
        mensaje: "Saturación crítica; valorar soporte de oxígeno",
        valor: v.sat,
        unidad: "%",
      });
  }

  if (v.temp != null && typeof v.temp === "number") {
    if (v.temp < TEMP_HIPO)
      alertas.push({
        codigo: "HIPOTERMIA",
        mensaje: "Temperatura por debajo de rango normal (hipotermia)",
        valor: v.temp,
        unidad: "°C",
      });
    if (v.temp >= TEMP_FEBRIL && v.temp < TEMP_HIPERTERMIA)
      alertas.push({
        codigo: "FIEBRE",
        mensaje: "Temperatura elevada (fiebre)",
        valor: v.temp,
        unidad: "°C",
      });
    if (v.temp >= TEMP_HIPERTERMIA)
      alertas.push({
        codigo: "HIPERTERMIA",
        mensaje: "Temperatura muy elevada (hipertermia)",
        valor: v.temp,
        unidad: "°C",
      });
  }

  return {
    valido: alertas.length === 0,
    alertas,
  };
}
