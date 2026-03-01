/**
 * Clave de localStorage para la Ficha Clínica Digital (persistencia al cerrar la app).
 */
export const FICHA_CLINICA_STORAGE_KEY = "ficha-clinica-ambulancia";

export interface TimestampEvento {
  evento: string;
  hora: string;
}

export interface FichaClinicaPersistida {
  hora_inicio_atencion: string;
  paciente_id: string;
  nombre_paciente: string;
  dni: string;
  sintomas_texto: string;
  xabcde: Record<string, string>;
  /** Signos vitales y campos nuevos */
  blood_loss: string;
  airway_status: string;
  respiration_rate: string;
  pulse: string;
  bp_systolic: string;
  bp_diastolic: string;
  saturacion_oxigeno: string;
  glasgowE: number;
  glasgowV: number;
  glasgowM: number;
  timestamp_eventos: TimestampEvento[];
}

const defaultPersistida: FichaClinicaPersistida = {
  hora_inicio_atencion: "",
  paciente_id: "",
  nombre_paciente: "",
  dni: "",
  sintomas_texto: "",
  xabcde: { X: "pendiente", A: "pendiente", B: "pendiente", C: "pendiente", D: "pendiente", E: "pendiente" },
  blood_loss: "",
  airway_status: "",
  respiration_rate: "",
  pulse: "",
  bp_systolic: "",
  bp_diastolic: "",
  saturacion_oxigeno: "",
  glasgowE: 0,
  glasgowV: 0,
  glasgowM: 0,
  timestamp_eventos: [],
};

export function loadFichaClinica(): FichaClinicaPersistida | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FICHA_CLINICA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FichaClinicaPersistida>;
    return { ...defaultPersistida, ...parsed };
  } catch {
    return null;
  }
}

export function saveFichaClinica(data: Partial<FichaClinicaPersistida>): void {
  if (typeof window === "undefined") return;
  try {
    const prev = loadFichaClinica();
    const merged = { ...defaultPersistida, ...prev, ...data };
    localStorage.setItem(FICHA_CLINICA_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
}

/** Borra la ficha clínica guardada (para "Nuevo Paciente" tras confirmar). */
export function clearFichaClinica(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(FICHA_CLINICA_STORAGE_KEY);
  } catch {
    // ignore
  }
}
