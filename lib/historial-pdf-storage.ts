import type { ReportSummaryData } from "@/lib/report-summary";
import { generateReportId } from "@/lib/report-id";

const HISTORIAL_PDF_KEY = "ambulancia-pro-historial-pdf";
const MAX_ENTRIES = 30;

export interface HistorialPdfEntry {
  id: string;
  createdAt: string;
  nombrePaciente: string;
  pacienteId: string;
  operadorId?: string;
  unidadId?: string;
  /** Ruta completa (URI) del PDF en el dispositivo (Capacitor). Para abrir con visor nativo. */
  fileUri?: string;
  data: ReportSummaryData;
}

function getRaw(): HistorialPdfEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORIAL_PDF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(items: HistorialPdfEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORIAL_PDF_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/** Lista de informes PDF guardados (los más recientes primero). */
export function getHistorialPdfList(): HistorialPdfEntry[] {
  const list = getRaw();
  return list.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Añade un informe al historial local (se llama tras generar/compartir PDF). Devuelve la entrada creada para poder guardarla en Firebase. */
export function addToHistorialPdf(
  data: ReportSummaryData,
  options?: { operadorId?: string; unidadId?: string; fileUri?: string; id?: string }
): HistorialPdfEntry {
  const list = getRaw();
  const id = options?.id ?? generateReportId();
  const nombrePaciente = (data.nombre_paciente ?? "").trim() || "Sin nombre";
  const pacienteId = (data.paciente_id ?? "").trim() || "sin-id";
  const entry: HistorialPdfEntry = {
    id,
    createdAt: new Date().toISOString(),
    nombrePaciente,
    pacienteId,
    operadorId: options?.operadorId,
    unidadId: options?.unidadId,
    fileUri: options?.fileUri,
    data,
  };
  list.unshift(entry);
  const trimmed = list.slice(0, MAX_ENTRIES);
  save(trimmed);
  return entry;
}

/** Elimina un informe del historial por id. */
export function removeFromHistorialPdf(id: string): void {
  const list = getRaw().filter((e) => e.id !== id);
  save(list);
}
