/**
 * 50 diagnósticos de emergencia más comunes para el triaje.
 * category = NivelGravedad sugerido (1 = Baja, 5 = Rojo/Crítica/Resucitación).
 */
import type { NivelGravedad } from "@/lib/types";

export interface DiagnosticoTriage {
  label: string;
  code: string;
  category: NivelGravedad;
}

export const DIAGNOSTICOS_TRIAGE: DiagnosticoTriage[] = [
  { label: "Infarto agudo de miocardio", code: "BA41", category: 5 },
  { label: "Paro cardiorrespiratorio", code: "MC82", category: 5 },
  { label: "RCP en curso", code: "MC82", category: 5 },
  { label: "ACV isquémico", code: "8B11", category: 5 },
  { label: "ACV hemorrágico", code: "8B12", category: 5 },
  { label: "Politraumatismo", code: "NA01", category: 5 },
  { label: "Crisis hipertensiva", code: "BA00", category: 4 },
  { label: "Insuficiencia respiratoria aguda", code: "CB01", category: 5 },
  { label: "Edema agudo de pulmón", code: "CB00", category: 5 },
  { label: "Disnea", code: "MD11", category: 4 },
  { label: "Asma agudo grave", code: "CA23", category: 4 },
  { label: "EPOC descompensado", code: "CA22", category: 4 },
  { label: "Neumotórax", code: "CB93", category: 5 },
  { label: "Shock hipovolémico", code: "MG10", category: 5 },
  { label: "Shock anafiláctico", code: "4A84", category: 5 },
  { label: "Anafilaxia", code: "4A84", category: 5 },
  { label: "Traumatismo craneoencefálico grave", code: "NA07", category: 5 },
  { label: "TCE leve/moderado", code: "NA07", category: 4 },
  { label: "Hemorragia masiva", code: "NA92", category: 5 },
  { label: "Coma", code: "MB20", category: 5 },
  { label: "Convulsión / Crisis convulsiva", code: "8A60", category: 4 },
  { label: "Status epiléptico", code: "8A62", category: 5 },
  { label: "Síncope", code: "MB20.1", category: 3 },
  { label: "Hipotensión severa", code: "BA00.1", category: 5 },
  { label: "Hipoglucemia severa", code: "5A21.0", category: 4 },
  { label: "Hiperglucemia / Cetoacidosis", code: "5A21", category: 4 },
  { label: "Intoxicación / Sobredosis", code: "NE60", category: 4 },
  { label: "Intento de suicidio", code: "NA00", category: 5 },
  { label: "Quemadura grave", code: "ND91", category: 4 },
  { label: "Ahogamiento / Casi ahogamiento", code: "NE23", category: 5 },
  { label: "Dolor torácico", code: "ME84", category: 4 },
  { label: "Síndrome coronario agudo", code: "BA40", category: 5 },
  { label: "Embolia pulmonar", code: "DB96", category: 5 },
  { label: "Obstrucción vía aérea", code: "CA42", category: 5 },
  { label: "Reacción alérgica grave", code: "4A84", category: 4 },
  { label: "Sepsis", code: "1D40", category: 5 },
  { label: "Traumatismo torácico", code: "NB30", category: 4 },
  { label: "Traumatismo abdominal", code: "NB31", category: 4 },
  { label: "Fractura de fémur / pelvis", code: "NC72", category: 4 },
  { label: "Fractura de columna / Lesión medular", code: "NC60", category: 5 },
  { label: "Hemorragia digestiva alta", code: "DA60", category: 4 },
  { label: "Abdomen agudo", code: "DA01", category: 4 },
  { label: "Cólico renal", code: "GB00", category: 3 },
  { label: "Parto inminente", code: "JA00", category: 4 },
  { label: "Preeclampsia / Eclampsia", code: "JA24", category: 5 },
  { label: "Crisis de ansiedad / Pánico", code: "6B00", category: 2 },
  { label: "Agitación psicomotriz", code: "6A00", category: 3 },
  { label: "Accidente de tráfico", code: "NA01.0", category: 4 },
  { label: "Caída de altura", code: "NA02", category: 4 },
];

/** Nombres que al seleccionar sugieren Nivel 5 (Rojo). */
export const LABELS_NIVEL_ROJO = [
  "paro cardiorrespiratorio",
  "rcp en curso",
  "infarto agudo de miocardio",
  "acv isquémico",
  "acv hemorrágico",
  "politraumatismo",
  "insuficiencia respiratoria aguda",
  "edema agudo de pulmón",
  "neumotórax",
  "shock hipovolémico",
  "shock anafiláctico",
  "anafilaxia",
  "traumatismo craneoencefálico grave",
  "hemorragia masiva",
  "coma",
  "status epiléptico",
  "hipotensión severa",
  "intento de suicidio",
  "ahogamiento / casi ahogamiento",
  "síndrome coronario agudo",
  "embolia pulmonar",
  "obstrucción vía aérea",
  "sepsis",
  "fractura de columna / lesión medular",
  "preeclampsia / eclampsia",
];

/** Mínimo de caracteres para mostrar resultados filtrados (evita listas enormes con 1 letra). */
const MIN_CARACTERES_BUSQUEDA = 2;

export function buscarDiagnosticos(query: string): DiagnosticoTriage[] {
  const q = query.trim().toLowerCase();
  if (!q) return DIAGNOSTICOS_TRIAGE.slice(0, 12);
  if (q.length < MIN_CARACTERES_BUSQUEDA) return [];
  return DIAGNOSTICOS_TRIAGE.filter(
    (d) => d.label.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
  ).slice(0, 15);
}

export function encontrarPorLabel(label: string): DiagnosticoTriage | undefined {
  const normal = label.trim().toLowerCase();
  return DIAGNOSTICOS_TRIAGE.find((d) => d.label.toLowerCase() === normal);
}

export function requiereNivelRojo(label: string): boolean {
  return LABELS_NIVEL_ROJO.includes(label.trim().toLowerCase());
}
