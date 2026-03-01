import type { PayloadTriage } from "@/lib/api";
import { sendTriagePayload } from "@/lib/api";

const QUEUE_KEY = "ficha-clinica-report-queue";

export interface QueuedReport {
  id: string;
  payload: PayloadTriage;
  createdAt: string;
}

function getQueueRaw(): QueuedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(items: QueuedReport[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/** Devuelve la cola de reportes pendientes de envío. */
export function getReportQueue(): QueuedReport[] {
  return getQueueRaw();
}

/** Añade un reporte a la cola (se guarda en localStorage). */
export function addReportToQueue(payload: PayloadTriage): void {
  const queue = getQueueRaw();
  const id = `report-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  queue.push({
    id,
    payload,
    createdAt: new Date().toISOString(),
  });
  saveQueue(queue);
}

function removeReportFromQueue(id: string): void {
  const queue = getQueueRaw().filter((r) => r.id !== id);
  saveQueue(queue);
}

/**
 * Intenta enviar todos los reportes de la cola. Elimina solo los que se envían correctamente (2xx).
 * Opcionalmente notifica cuántos se enviaron.
 */
export async function processReportQueue(onSent?: (count: number) => void): Promise<void> {
  const queue = getQueueRaw();
  if (queue.length === 0) return;

  let sent = 0;
  for (const report of queue) {
    try {
      const { status } = await sendTriagePayload(report.payload);
      if (status >= 200 && status < 300) {
        removeReportFromQueue(report.id);
        sent += 1;
      }
    } catch {
      // Mantener en cola para reintentar más tarde
    }
  }
  if (sent > 0 && onSent) onSent(sent);
}
