/** Nivel de gravedad del triaje (1 = menor, 5 = crítico). */
export type NivelGravedad = 1 | 2 | 3 | 4 | 5;

export const NIVELES_TRIAGE = [
  "No urgente",
  "Prioritario",
  "Urgencia",
  "Emergencia",
  "Resucitación (Inmediato)",
] as const;

export type NivelTriageNombre = (typeof NIVELES_TRIAGE)[number];

export interface RespuestaTriageLLM {
  nivel: NivelTriageNombre;
  nivel_gravedad?: NivelGravedad;
  explicacion_tecnica?: string;
  pasos_a_seguir?: string[];
  diagnostico_presuntivo?: string;
  justificacion?: string;
  recomendacion_inmediata?: string;
  fallback?: boolean;
}

export const MIN_SINTOMAS_CARACTERES = 1;

export interface SignosVitales {
  tensionArterial?: string;
  frecuenciaCardiaca?: number;
  temperatura?: number;
  saturacionOxigeno?: number;
  frecuenciaRespiratoria?: number;
}

export interface RegistroTriage {
  paciente_id: string;
  sintomas_texto: string;
  nivel_gravedad: NivelGravedad;
  recomendacion: string;
  signos_vitales: SignosVitales;
  fecha: string;
  nivel?: NivelTriageNombre;
  explicacion_tecnica?: string;
  pasos_a_seguir?: string[];
  mensaje_fallback?: string;
  diagnostico_presuntivo?: string;
  justificacion?: string;
  recomendacion_inmediata?: string;
  nombre_paciente?: string;
  dni?: string;
  glasgow?: GlasgowDesglose;
  hora_inicio_atencion?: string;
  blood_loss?: string;
  airway_status?: string;
  respiration_rate?: number;
  pulse?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  glasgow_score?: number;
}

export interface GlasgowDesglose {
  E: number;
  V: number;
  M: number;
  puntaje_glasgow: number;
}

export interface EntradaTriage {
  paciente_id: string;
  sintomas_texto: string;
  signos_vitales?: SignosVitales;
  hora_inicio_atencion?: string;
  nombre_paciente?: string;
  dni?: string;
  glasgow?: GlasgowDesglose;
  blood_loss?: string;
  airway_status?: string;
  respiration_rate?: number;
  pulse?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  glasgow_score?: number;
}
