import type { ReportSummaryData } from "@/lib/report-summary";

const HISTORIAL_PDF_KEY = "ambulancia-pro-historial-pdf";
const MAX_ENTRIES = 30;

export interface HistorialPdfEntry {
  id: string;
  createdAt: string;
  nombrePaciente: string;
  pacienteId: string;
  operadorId?: string;
  unidadId?: string;
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

/** Añade un informe al historial local (se llama tras generar/compartir PDF). */
export function addToHistorialPdf(
  data: ReportSummaryData,
  options?: { operadorId?: string; unidadId?: string }
): void {
  const list = getRaw();
  const id = `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const nombrePaciente = (data.nombre_paciente ?? "").trim() || "Sin nombre";
  const pacienteId = (data.paciente_id ?? "").trim() || "sin-id";
  list.unshift({
    id,
    createdAt: new Date().toISOString(),
    nombrePaciente,
    pacienteId,
    operadorId: options?.operadorId,
    unidadId: options?.unidadId,
    data,
  });
  const trimmed = list.slice(0, MAX_ENTRIES);
  save(trimmed);
}

/** Elimina un informe del historial por id. */
export function removeFromHistorialPdf(id: string): void {
  const list = getRaw().filter((e) => e.id !== id);
  save(list);
}
