import type { NivelGravedad, SignosVitales } from "./types";

/** Evalúa nivel de gravedad (1-5) según texto de síntomas y signos vitales. Simulado. */
export function evaluarNivelGravedad(
  sintomasTexto: string,
  signosVitales?: SignosVitales
): NivelGravedad {
  const texto = sintomasTexto.toLowerCase();
  let nivel: NivelGravedad = 2;

  if (signosVitales) {
    if (
      (signosVitales.saturacionOxigeno !== undefined && signosVitales.saturacionOxigeno < 92) ||
      (signosVitales.frecuenciaCardiaca !== undefined && signosVitales.frecuenciaCardiaca > 120) ||
      (signosVitales.frecuenciaCardiaca !== undefined && signosVitales.frecuenciaCardiaca < 50)
    ) {
      nivel = 4;
    } else if (
      (signosVitales.temperatura !== undefined && signosVitales.temperatura >= 39) ||
      (signosVitales.frecuenciaRespiratoria !== undefined && signosVitales.frecuenciaRespiratoria > 24)
    ) {
      nivel = 3;
    }
  }

  if (
    /dolor (pecho|torácico)|no respiro|desmayo|convulsión|hemorragia|accidente|caída fuerte|inconsciente/i.test(
      texto
    )
  ) {
    nivel = Math.max(nivel, 5) as NivelGravedad;
  } else if (
    /fiebre alta|dificultad para respirar|vómito persistente|dolor fuerte|sangre/i.test(texto)
  ) {
    nivel = Math.max(nivel, 4) as NivelGravedad;
  } else if (/fiebre|dolor|mareo|tos/i.test(texto)) {
    nivel = Math.max(nivel, 3) as NivelGravedad;
  } else if (/molestia|leve|pequeño/i.test(texto)) {
    nivel = Math.min(nivel, 2) as NivelGravedad;
  } else if (texto.trim().length < 5) {
    nivel = 1;
  }

  return Math.min(5, Math.max(1, nivel)) as NivelGravedad;
}

/** Genera recomendación según nivel de gravedad. Simulado. */
export function generarRecomendacion(nivel: NivelGravedad): string {
  const recomendaciones: Record<NivelGravedad, string> = {
    1: "Valoración en atención primaria o consulta programada. Mantener hidratación y reposo si procede.",
    2: "Valoración en urgencias de baja prioridad o en centro de salud en las próximas horas.",
    3: "Valoración en urgencias en un plazo corto. Vigilar evolución de los síntomas.",
    4: "Valoración urgente. Acudir a urgencias o llamar a emergencias según disponibilidad.",
    5: "Atención inmediata. Llamar a emergencias (112) o acudir al servicio de urgencias sin demora.",
  };
  return recomendaciones[nivel];
}
