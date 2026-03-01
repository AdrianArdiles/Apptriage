/** Nivel de gravedad del triaje (1 = menor, 5 = crítico). */
export type NivelGravedad = 1 | 2 | 3 | 4 | 5;

/** Niveles de triaje clínico (ESI / 5 niveles). */
export const NIVELES_TRIAGE = [
  "No urgente",
  "Prioritario",
  "Urgencia",
  "Emergencia",
  "Resucitación (Inmediato)",
] as const;

export type NivelTriageNombre = (typeof NIVELES_TRIAGE)[number];

/** Respuesta de categorización por LLM (formato actualizado de la API). */
export interface RespuestaTriageLLM {
  nivel: NivelTriageNombre;
  /** Nivel numérico 1-5 (para compatibilidad). */
  nivel_gravedad?: NivelGravedad;
  explicacion_tecnica?: string;
  pasos_a_seguir?: string[];
  /** Breve hipótesis médica (qué condición podría causar los síntomas). */
  diagnostico_presuntivo?: string;
  /** Por qué se eligió ese nivel y diagnóstico. */
  justificacion?: string;
  /** Qué debe hacer el paciente ahora mismo. */
  recomendacion_inmediata?: string;
  fallback?: boolean;
}

/** Mínimo de caracteres permitidos en sintomas_texto (con chips basta 1 síntoma seleccionado). */
export const MIN_SINTOMAS_CARACTERES = 1;

/** Signos vitales opcionales para el triaje. */
export interface SignosVitales {
  tensionArterial?: string;
  frecuenciaCardiaca?: number;
  temperatura?: number;
  saturacionOxigeno?: number;
  frecuenciaRespiratoria?: number;
}

/** Registro de triaje almacenado (mock DB) y devuelto por la API. */
export interface RegistroTriage {
  paciente_id: string;
  sintomas_texto: string;
  nivel_gravedad: NivelGravedad;
  recomendacion: string;
  signos_vitales: SignosVitales;
  fecha: string;
  /** Nivel nominal (5 niveles clínicos). */
  nivel?: NivelTriageNombre;
  /** Explicación técnica breve de la categorización. */
  explicacion_tecnica?: string;
  /** Pasos a seguir recomendados. */
  pasos_a_seguir?: string[];
  /** Mensaje cuando se usó fallback (IA no disponible). */
  mensaje_fallback?: string;
  /** Diagnóstico presuntivo (hipótesis breve). */
  diagnostico_presuntivo?: string;
  /** Justificación del nivel y diagnóstico. */
  justificacion?: string;
  /** Recomendación inmediata para el paciente. */
  recomendacion_inmediata?: string;
  /** Nombre del paciente (opcional, para historial). */
  nombre_paciente?: string;
  /** DNI del paciente (opcional, para historial). */
  dni?: string;
  /** Desglose Glasgow si se registró (para historial). */
  glasgow?: GlasgowDesglose;
  /** Hora de inicio de atención (evaluación inicial paramédicos). */
  hora_inicio_atencion?: string;
  /** Ficha clínica: pérdida de sangre, estado vía aérea, etc. */
  blood_loss?: string;
  airway_status?: string;
  respiration_rate?: number;
  pulse?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  glasgow_score?: number;
}

/** Desglose Escala de Glasgow (E, V, M) para el prompt de la IA. */
export interface GlasgowDesglose {
  E: number;
  V: number;
  M: number;
  puntaje_glasgow: number;
}

/** Payload para enviar síntomas y signos vitales al API (paramédicos/ambulancia). */
export interface EntradaTriage {
  paciente_id: string;
  sintomas_texto: string;
  signos_vitales?: SignosVitales;
  /** Hora de inicio de atención (ISO string). */
  hora_inicio_atencion?: string;
  /** Opcional: nombre del paciente (si no se envía, se usa paciente_id). */
  nombre_paciente?: string;
  /** Opcional: DNI del paciente. */
  dni?: string;
  /** Opcional: Escala de Glasgow (E, V, M y total). La IA da prioridad absoluta si puntaje_glasgow ≤ 8. */
  glasgow?: GlasgowDesglose;
  /** Ficha clínica digital: pérdida de sangre. */
  blood_loss?: string;
  /** Estado vía aérea. */
  airway_status?: string;
  /** Frecuencia respiratoria (rpm). */
  respiration_rate?: number;
  /** Pulso (lpm). */
  pulse?: number;
  /** Tensión arterial sistólica. */
  bp_systolic?: number;
  /** Tensión arterial diastólica. */
  bp_diastolic?: number;
  /** Puntaje total Glasgow (3-15). */
  glasgow_score?: number;
}
