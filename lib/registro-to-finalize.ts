import type { RegistroTriage } from "@/lib/types";
import type { ReportSummaryData } from "@/lib/report-summary";
import type { IntervencionPayload } from "@/lib/firebase-intervenciones";
import { getAtendidoPor } from "@/lib/operador-storage";

const PENDING_SYNC_KEY = "ambulancia-pro-pendiente-sincronizar";

export interface PendingFirebaseSync {
  payload: IntervencionPayload;
  savedAt: string;
  pendienteSincronizar: true;
}

/** Opcional: impresión clínica desde el combobox (triaje) para PDF "Impresión Clínica: X (CIE-11: Y)". */
export interface ImpresionClinicaOverride {
  nombre: string;
  cie11: string;
}

/** Construye ReportSummaryData a partir del registro de triaje (para generar PDF). */
export function registroToReportSummaryData(
  registro: RegistroTriage,
  impresionClinica?: ImpresionClinicaOverride | null
): ReportSummaryData {
  const signos = registro.signos_vitales ?? {};
  if (registro.pulse != null) signos.frecuenciaCardiaca = registro.pulse;
  if (registro.bp_systolic != null && registro.bp_diastolic != null) {
    signos.tensionArterial = `${registro.bp_systolic}/${registro.bp_diastolic}`;
  }
  const glasgow = registro.glasgow
    ? {
        E: registro.glasgow.E,
        V: registro.glasgow.V,
        M: registro.glasgow.M,
        puntaje_glasgow: registro.glasgow.puntaje_glasgow ?? registro.glasgow_score ?? 0,
      }
    : undefined;
  const diagnostico =
    registro.diagnostico_presuntivo?.trim()
      ? {
          termino_comun: registro.diagnostico_presuntivo.trim(),
          codigo_cie: "",
          descripcion_tecnica: registro.diagnostico_presuntivo.trim(),
        }
      : undefined;

  return {
    hora_inicio_atencion: registro.hora_inicio_atencion,
    paciente_id: registro.paciente_id,
    nombre_paciente: registro.nombre_paciente,
    dni: registro.dni,
    sintomas_texto: registro.sintomas_texto,
    xabcde: undefined,
    signos_vitales: Object.keys(signos).length > 0 ? signos : undefined,
    glasgow,
    glasgow_score: registro.glasgow_score,
    blood_loss: registro.blood_loss,
    airway_status: registro.airway_status,
    respiration_rate: registro.respiration_rate,
    pulse: registro.pulse,
    bp_systolic: registro.bp_systolic,
    bp_diastolic: registro.bp_diastolic,
    timestamp_eventos: undefined,
    diagnostico,
    impresion_clinica: impresionClinica ?? undefined,
    nivel_gravedad: registro.nivel_gravedad,
  };
}

/** Construye el payload de intervención para Firebase a partir del registro. */
export function buildIntervencionPayloadFromRegistro(
  registro: RegistroTriage,
  operadorId: string,
  unidadId: string
): IntervencionPayload {
  const hasRCP =
    (registro.sintomas_texto ?? "").toUpperCase().includes("RCP") ||
    (registro.diagnostico_presuntivo ?? "").toUpperCase().includes("RCP");
  const diagnostico_presuntivo =
    registro.diagnostico_presuntivo?.trim()
      ? {
          termino_comun: registro.diagnostico_presuntivo.trim(),
          codigo_cie: "",
          descripcion_tecnica: registro.diagnostico_presuntivo.trim(),
        }
      : undefined;

  return {
    operadorId,
    unidadId,
    updatedAt: new Date().toISOString(),
    currentStep: 11,
    paciente_id: registro.paciente_id,
    nombre_paciente: registro.nombre_paciente,
    dni: registro.dni,
    sintomas_texto: registro.sintomas_texto,
    xabcde: {},
    hora_inicio_atencion: registro.hora_inicio_atencion,
    glasgow_score: registro.glasgow_score,
    hasRCP,
    atendido_por: getAtendidoPor() || undefined,
    diagnostico_presuntivo,
  };
}

/** Guarda en localStorage un reporte pendiente de sincronizar con Firebase. */
export function savePendingFirebaseSync(payload: IntervencionPayload): void {
  if (typeof window === "undefined") return;
  try {
    const item: PendingFirebaseSync = {
      payload,
      savedAt: new Date().toISOString(),
      pendienteSincronizar: true,
    };
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(item));
  } catch {
    // ignore
  }
}

/** Lee el reporte pendiente de sincronizar (si existe). */
export function getPendingFirebaseSync(): PendingFirebaseSync | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && (parsed as PendingFirebaseSync).pendienteSincronizar) {
      return parsed as PendingFirebaseSync;
    }
    return null;
  } catch {
    return null;
  }
}

/** Elimina el reporte pendiente de sincronizar tras enviar correctamente. */
export function clearPendingFirebaseSync(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_SYNC_KEY);
  } catch {
    // ignore
  }
}
