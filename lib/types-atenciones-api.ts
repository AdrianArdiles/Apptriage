import type { ReportSummaryData } from "@/lib/report-summary";

/**
 * Estructura de una atención devuelta por GET /api/atenciones (Neon vía Prisma).
 * Coincide con lo que usa el frontend (Historial, Manager Exportar).
 */
export interface AtencionFromApi {
  /** ID para mostrar/enlazar (report_id del cliente o id de Prisma). */
  id: string;
  /** PK en Neon; usar para DELETE. */
  atencionId: string;
  createdAt: string;
  nombrePaciente: string;
  pacienteId: string;
  operadorId?: string;
  unidadId?: string;
  sintomas_texto?: string;
  diagnostico_codigo?: string;
  data: ReportSummaryData;
}
