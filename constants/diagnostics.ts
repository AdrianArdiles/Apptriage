/**
 * Alias para importar desde @/constants/diagnostics (inglés) o @/constants/diagnosticos (español).
 * Fuente única: lista de diagnósticos de emergencia para el buscador.
 */
export {
  DIAGNOSTICOS_TRIAGE,
  buscarDiagnosticos,
  encontrarPorLabel,
  requiereNivelRojo,
  LABELS_NIVEL_ROJO,
} from "./diagnosticos";
export type { DiagnosticoTriage } from "./diagnosticos";
