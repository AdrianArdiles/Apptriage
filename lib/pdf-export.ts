import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getOperadorId, getUnidadId } from "@/lib/operador-storage";
import type { ReportSummaryData } from "@/lib/report-summary";

const TITLE = "INFORME DE ATENCIÓN PREHOSPITALARIA - AMBULANCIA PRO";
const MARGIN = 14;
const PAGE_W = 210;
const LINE_HEIGHT = 6;
const LOGO_HEIGHT_MM = 10;
const LOGO_WIDTH_MM = 24;

function sectionTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(text, MARGIN, y);
  return y + LINE_HEIGHT;
}

function sectionLine(doc: jsPDF, y: number, label: string, value: string): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${label}: ${value || "—"}`, MARGIN + 2, y);
  return y + LINE_HEIGHT;
}

function drawSectionBorder(doc: jsPDF, yStart: number, yEnd: number): void {
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN, yStart - 4, PAGE_W - 2 * MARGIN, yEnd - yStart + 6);
}

export type PDFExportOptions = { logoDataUrl?: string };

/**
 * Genera el PDF del informe y devuelve el blob para descargar o compartir.
 */
export function exportToPDF(data: ReportSummaryData, options?: PDFExportOptions): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 14;

  if (options?.logoDataUrl) {
    doc.addImage(options.logoDataUrl, "PNG", MARGIN, y, LOGO_WIDTH_MM, LOGO_HEIGHT_MM);
    y += LOGO_HEIGHT_MM + 4;
  } else {
    y += 6;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(TITLE, MARGIN, y);
  y += 10;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  const sectionStart0 = y;
  y = sectionTitle(doc, y, "OPERADOR / GUARDIA");
  y = sectionLine(doc, y, "ID del paramédico", getOperadorId() || "—");
  y = sectionLine(doc, y, "N° de Unidad / Móvil", getUnidadId() || "—");
  y += 4;
  drawSectionBorder(doc, sectionStart0, y);
  y += 10;

  const sectionStart = y;
  y = sectionTitle(doc, y, "1. PACIENTE");
  y = sectionLine(doc, y, "ID / Nº historia", data.paciente_id ?? "");
  y = sectionLine(doc, y, "Nombre", data.nombre_paciente?.trim() ?? "");
  y = sectionLine(doc, y, "DNI", data.dni?.trim() ?? "");
  y = sectionLine(doc, y, "Observaciones", data.sintomas_texto?.trim() ?? "");
  y += 4;
  drawSectionBorder(doc, sectionStart, y);
  y += 10;

  const sectionStart2 = y;
  y = sectionTitle(doc, y, "2. HORA DE INICIO DE ATENCIÓN");
  y = sectionLine(
    doc,
    y,
    "Fecha y hora",
    data.hora_inicio_atencion ? new Date(data.hora_inicio_atencion).toLocaleString("es-ES") : ""
  );
  y += 4;
  drawSectionBorder(doc, sectionStart2, y);
  y += 10;

  const sectionStart3 = y;
  y = sectionTitle(doc, y, "3. EVALUACIÓN XABCDE");
  const xabcdeItems = [
    { letra: "X", titulo: "eXanguinación" },
    { letra: "A", titulo: "Vía aérea" },
    { letra: "B", titulo: "Respiración" },
    { letra: "C", titulo: "Circulación" },
    { letra: "D", titulo: "Discapacidad" },
    { letra: "E", titulo: "Exposición" },
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const item of xabcdeItems) {
    const estado = data.xabcde?.[item.letra] ?? "pendiente";
    doc.text(`  ${item.letra} - ${item.titulo}: ${String(estado).toUpperCase()}`, MARGIN + 2, y);
    y += LINE_HEIGHT;
  }
  y += 4;
  drawSectionBorder(doc, sectionStart3, y);
  y += 10;

  const sectionStart4 = y;
  y = sectionTitle(doc, y, "4. SIGNOS VITALES Y DATOS CLÍNICOS");
  const sv = data.signos_vitales ?? {};
  const ta =
    sv.tensionArterial ??
    (data.bp_systolic != null && data.bp_diastolic != null ? `${data.bp_systolic}/${data.bp_diastolic}` : "");
  y = sectionLine(doc, y, "Tensión arterial", ta);
  y = sectionLine(doc, y, "Pulso / FC (lpm)", String(sv.frecuenciaCardiaca ?? data.pulse ?? ""));
  y = sectionLine(doc, y, "Saturación O₂ (%)", String(sv.saturacionOxigeno ?? ""));
  y = sectionLine(doc, y, "Frec. respiratoria (/min)", String(sv.frecuenciaRespiratoria ?? data.respiration_rate ?? ""));
  y = sectionLine(doc, y, "Pérdida de sangre", data.blood_loss ?? "");
  y = sectionLine(doc, y, "Estado vía aérea", data.airway_status ?? "");
  y += 4;
  drawSectionBorder(doc, sectionStart4, y);
  y += 10;

  const sectionStart5 = y;
  y = sectionTitle(doc, y, "5. ESCALA DE GLASGOW");
  if (data.glasgow) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`  Ocular (E): ${data.glasgow.E}  |  Verbal (V): ${data.glasgow.V}  |  Motor (M): ${data.glasgow.M}`, MARGIN + 2, y);
    y += LINE_HEIGHT;
    doc.text(`  Puntaje total: ${data.glasgow.puntaje_glasgow}`, MARGIN + 2, y);
    y += LINE_HEIGHT;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("  —", MARGIN + 2, y);
    y += LINE_HEIGHT;
  }
  y += 4;
  drawSectionBorder(doc, sectionStart5, y);
  y += 10;

  y = sectionTitle(doc, y, "6. EVENTOS REGISTRADOS (TIMESTAMPS)");
  y += 2;

  const eventos = data.timestamp_eventos ?? [];
  const tableBody = eventos.map((ev) => [
    new Date(ev.hora).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "medium" }),
    ev.evento,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Hora", "Evento"]],
    body: tableBody.length > 0 ? tableBody : [["—", "Ninguno"]],
    margin: { left: MARGIN },
    tableWidth: PAGE_W - 2 * MARGIN,
    theme: "grid",
    headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    styles: { cellPadding: 3 },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 20;
  y = finalY + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Documento generado: ${new Date().toLocaleString("es-ES")} — Ambulancia Pro`, MARGIN, y);

  return doc;
}

/**
 * Devuelve el PDF como Blob (para web) o como base64 (para Capacitor).
 */
export function getPDFBlob(data: ReportSummaryData, options?: PDFExportOptions): Blob {
  const doc = exportToPDF(data, options);
  return doc.output("blob");
}

/**
 * Devuelve el PDF en base64 para guardar con Filesystem y compartir en Capacitor.
 */
export function getPDFBase64(data: ReportSummaryData, options?: PDFExportOptions): string {
  const doc = exportToPDF(data, options);
  return doc.output("datauristring").split(",")[1] ?? "";
}
