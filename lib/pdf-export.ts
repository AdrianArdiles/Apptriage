import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getOperadorId, getUnidadId, getAtendidoPor } from "@/lib/operador-storage";
import type { ReportSummaryData } from "@/lib/report-summary";

const TITLE = "INFORME DE ATENCIÓN PREHOSPITALARIA";
const SUBTITLE = "AMBULANCIA PRO";
const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const LINE_HEIGHT = 5.5;
const LOGO_HEIGHT_MM = 10;
const LOGO_WIDTH_MM = 24;
const BANDA_ROJA_ANCHO = 5;
const QR_SIZE_MM = 18;
const DIVIDER_COLOR = [180, 180, 180] as [number, number, number];

export type PDFExportOptions = {
  logoDataUrl?: string;
  /** ID de la intervención (para QR y trazabilidad). */
  reportId?: string;
  /** Data URL del código QR generado a partir de reportId. */
  qrDataUrl?: string;
};

function getContentX(esNivelRojo: boolean): number {
  return MARGIN + (esNivelRojo ? BANDA_ROJA_ANCHO : 0);
}

function sectionTitle(doc: jsPDF, y: number, text: string, contentX: number): number {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text(text, contentX, y);
  return y + LINE_HEIGHT + 2;
}

function sectionLine(doc: jsPDF, y: number, label: string, value: string, contentX: number, indent = 0): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`${label}: ${value || "—"}`, contentX + 2 + indent, y);
  return y + LINE_HEIGHT;
}

/** Línea divisoria elegante (doble línea). */
function drawDivider(doc: jsPDF, y: number, contentX: number): number {
  const xStart = contentX;
  const xEnd = PAGE_W - MARGIN;
  doc.setDrawColor(...DIVIDER_COLOR);
  doc.setLineWidth(0.15);
  doc.line(xStart, y, xEnd, y);
  doc.line(xStart, y + 1.2, xEnd, y + 1.2);
  return y + 4;
}

function drawSectionBlock(doc: jsPDF, yStart: number, yEnd: number, contentX: number): void {
  const w = PAGE_W - MARGIN - contentX - MARGIN;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.setFillColor(252, 252, 252);
  doc.rect(contentX, yStart - 3, w, yEnd - yStart + 5, "FD");
  doc.rect(contentX, yStart - 3, w, yEnd - yStart + 5, "S");
}

/** Bloque diagnóstico CIE-11: bordes redondeados, tipografía técnica (monospace), destacado. */
function drawBloqueCIE11(
  doc: jsPDF,
  y: number,
  nombre: string,
  cie11: string,
  contentX: number
): number {
  const x = contentX + 2;
  const w = PAGE_W - contentX - MARGIN - 4;
  const blockH = 18;
  const r = 2;
  const boxX = contentX;
  const boxY = y - 2;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);
  if (typeof (doc as unknown as { roundedRect?: unknown }).roundedRect === "function") {
    (doc as unknown as { roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, s: string) => void }).roundedRect(boxX, boxY, w + 4, blockH, r, r, "FD");
  } else {
    doc.rect(boxX, boxY, w + 4, blockH, "FD");
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("DIAGNÓSTICO CIE-11", x, y + 2);

  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const codigoTexto = cie11 ? `[${cie11}]` : "";
  doc.text(codigoTexto, x, y + 8);
  const codeWidth = doc.getTextWidth(codigoTexto);
  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(nombre.trim(), x + codeWidth + (codigoTexto ? 3 : 0), y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Impresión clínica · Clasificación Internacional de Enfermedades 11.ª revisión", x, y + 13);
  return y + blockH + 3;
}

/** Banda roja lateral para triaje Nivel 1 (Rojo). */
function drawBandaRoja(doc: jsPDF): void {
  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, BANDA_ROJA_ANCHO, PAGE_H, "F");
  doc.setFillColor(220, 38, 38);
  doc.rect(0.5, 0, BANDA_ROJA_ANCHO - 0.5, PAGE_H, "F");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("NIVEL 1", 1, 20);
  doc.text("ROJO", 1, 25);
}

/** Espacio de firma y sello oficial. */
function drawFirmaSello(doc: jsPDF, y: number, contentX: number): number {
  const x = contentX + 2;
  const w = 70;
  const h = 28;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.4);
  doc.setFillColor(250, 250, 250);
  doc.rect(x, y, w, h, "FD");
  doc.rect(x, y, w, h, "S");

  const atendidoPor = getAtendidoPor();
  const texto = atendidoPor || getOperadorId() || "Paramédico";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const lines = doc.splitTextToSize(texto, w - 4);
  doc.text(lines, x + 4, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Firma digital · Documento oficial", x + 4, y + 20);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(x + 4, y + 22, x + w - 4, y + 22);
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text("Generado electrónicamente — Ambulancia Pro", x + 4, y + 26);
  return y + h + 6;
}

/**
 * Normaliza datos para el PDF: acepta tanto ReportSummaryData como objetos con claves alternativas
 * (p. ej. desde localStorage o historial) para que los campos no queden vacíos en la APK.
 */
function normalizeReportData(data: ReportSummaryData): ReportSummaryData {
  const d = data as Record<string, unknown>;
  return {
    ...data,
    nombre_paciente: (data.nombre_paciente ?? (d.nombrePaciente as string) ?? "").toString().trim() || undefined,
    paciente_id: (data.paciente_id ?? (d.pacienteId as string) ?? "").toString().trim() || undefined,
    hora_inicio_atencion: (data.hora_inicio_atencion ?? (d.hora_inicio_atencion as string))?.toString() || undefined,
    sintomas_texto: (data.sintomas_texto ?? (d.sintomas_texto as string) ?? "").toString().trim() || undefined,
    dni: (data.dni ?? (d.dni as string) ?? "").toString().trim() || undefined,
    xabcde: data.xabcde ?? (d.xabcde as Record<string, string>) ?? undefined,
    diagnostico: data.diagnostico ?? (d.diagnostico as ReportSummaryData["diagnostico"]) ?? undefined,
    impresion_clinica: data.impresion_clinica ?? (d.impresion_clinica as ReportSummaryData["impresion_clinica"]) ?? undefined,
    signos_vitales: data.signos_vitales ?? (d.signos_vitales as ReportSummaryData["signos_vitales"]) ?? undefined,
    glasgow: data.glasgow ?? (d.glasgow as ReportSummaryData["glasgow"]) ?? undefined,
    glasgow_score: data.glasgow_score ?? (d.glasgow_score as number) ?? undefined,
    timestamp_eventos: data.timestamp_eventos ?? (d.timestamp_eventos as ReportSummaryData["timestamp_eventos"]) ?? undefined,
    nivel_gravedad: data.nivel_gravedad ?? (d.nivel_gravedad as number) ?? undefined,
    blood_loss: data.blood_loss ?? (d.blood_loss as string) ?? undefined,
    airway_status: data.airway_status ?? (d.airway_status as string) ?? undefined,
    respiration_rate: data.respiration_rate ?? (d.respiration_rate as number) ?? undefined,
    pulse: data.pulse ?? (d.pulse as number) ?? undefined,
    bp_systolic: data.bp_systolic ?? (d.bp_systolic as number) ?? undefined,
    bp_diastolic: data.bp_diastolic ?? (d.bp_diastolic as number) ?? undefined,
  };
}

/**
 * Genera el PDF del informe con diseño profesional: bloques, CIE-11 destacado, QR, firma y banda roja si aplica.
 */
export function exportToPDF(data: ReportSummaryData, options?: PDFExportOptions): jsPDF {
  const normalized = normalizeReportData(data);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const esNivelRojo = normalized.nivel_gravedad === 5;
  if (esNivelRojo) drawBandaRoja(doc);

  let y = 14;
  const contentX = getContentX(esNivelRojo);

  if (options?.qrDataUrl) {
    try {
      doc.addImage(options.qrDataUrl, "PNG", PAGE_W - MARGIN - QR_SIZE_MM, y, QR_SIZE_MM, QR_SIZE_MM);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text("Validación", PAGE_W - MARGIN - QR_SIZE_MM, y + QR_SIZE_MM + 3);
    } catch {
      // si falla la imagen QR, seguimos sin ella
    }
  }

  if (options?.logoDataUrl) {
    doc.addImage(options.logoDataUrl, "PNG", contentX, y, LOGO_WIDTH_MM, LOGO_HEIGHT_MM);
    y += LOGO_HEIGHT_MM + 3;
  } else {
    y += 4;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(TITLE, contentX, y);
  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text(SUBTITLE, contentX, y);
  y += 8;

  y = drawDivider(doc, y, contentX);

  // ─── 1. IDENTIFICACIÓN ─────────────────────────────────────────
  const idStart = y;
  y = sectionTitle(doc, y, "1. IDENTIFICACIÓN", contentX);
  y = sectionLine(doc, y, "ID del paramédico", getOperadorId() || "—", contentX);
  y = sectionLine(doc, y, "N° de Unidad / Móvil", getUnidadId() || "—", contentX);
  y = sectionLine(doc, y, "ID / Nº historia", normalized.paciente_id ?? "", contentX);
  y = sectionLine(doc, y, "Nombre", normalized.nombre_paciente?.trim() ?? "", contentX);
  y = sectionLine(doc, y, "DNI", normalized.dni?.trim() ?? "", contentX);
  y = sectionLine(doc, y, "Observaciones", normalized.sintomas_texto?.trim() ?? "", contentX);
  const atendidoPor = getAtendidoPor();
  if (atendidoPor) y = sectionLine(doc, y, "Atendido por", atendidoPor, contentX);
  y = sectionLine(
    doc,
    y,
    "Hora de inicio",
    normalized.hora_inicio_atencion ? new Date(normalized.hora_inicio_atencion).toLocaleString("es-ES") : "—",
    contentX
  );
  y += 3;
  drawSectionBlock(doc, idStart, y, contentX);
  y += 8;

  // ─── 2. EVALUACIÓN XABCDE ──────────────────────────────────────
  y = drawDivider(doc, y, contentX);
  const xabcdeStart = y;
  y = sectionTitle(doc, y, "2. EVALUACIÓN XABCDE", contentX);
  const xabcdeItems = [
    { letra: "X", titulo: "eXanguinación" },
    { letra: "A", titulo: "Vía aérea" },
    { letra: "B", titulo: "Respiración" },
    { letra: "C", titulo: "Circulación" },
    { letra: "D", titulo: "Discapacidad" },
    { letra: "E", titulo: "Exposición" },
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  for (const item of xabcdeItems) {
    const estado = normalized.xabcde?.[item.letra] ?? "pendiente";
    doc.text(`  ${item.letra} — ${item.titulo}: ${String(estado).toUpperCase()}`, contentX + 2, y);
    y += LINE_HEIGHT;
  }
  y += 3;
  drawSectionBlock(doc, xabcdeStart, y, contentX);
  y += 8;

  // ─── 3. IMPRESIÓN CLÍNICA (bloque especial CIE-11) ──────────────
  y = drawDivider(doc, y, contentX);
  if (normalized.impresion_clinica?.nombre) {
    y = drawBloqueCIE11(
      doc,
      y,
      normalized.impresion_clinica.nombre,
      normalized.impresion_clinica.cie11 ?? "",
      contentX
    );
  } else if (normalized.diagnostico) {
    y = drawBloqueCIE11(
      doc,
      y,
      normalized.diagnostico.termino_comun,
      normalized.diagnostico.codigo_cie ?? "",
      contentX
    );
  } else {
    const blockY = y;
    y = sectionTitle(doc, y, "3. IMPRESIÓN CLÍNICA", contentX);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("  Sin diagnóstico registrado.", contentX + 2, y + 2);
    y += 10;
    drawSectionBlock(doc, blockY, y, contentX);
  }
  y += 6;

  // ─── 4. SIGNOS VITALES Y GLASGOW ───────────────────────────────
  y = drawDivider(doc, y, contentX);
  const signosStart = y;
  y = sectionTitle(doc, y, "4. SIGNOS VITALES Y DATOS CLÍNICOS", contentX);
  const sv = normalized.signos_vitales ?? {};
  const ta =
    sv.tensionArterial ??
    (normalized.bp_systolic != null && normalized.bp_diastolic != null ? `${normalized.bp_systolic}/${normalized.bp_diastolic}` : "");
  y = sectionLine(doc, y, "Tensión arterial", ta, contentX, 2);
  y = sectionLine(doc, y, "Pulso / FC (lpm)", String(sv.frecuenciaCardiaca ?? normalized.pulse ?? ""), contentX, 2);
  y = sectionLine(doc, y, "Saturación O₂ (%)", String(sv.saturacionOxigeno ?? ""), contentX, 2);
  y = sectionLine(doc, y, "Frec. respiratoria (/min)", String(sv.frecuenciaRespiratoria ?? normalized.respiration_rate ?? ""), contentX, 2);
  y = sectionLine(doc, y, "Pérdida de sangre", normalized.blood_loss ?? "", contentX, 2);
  y = sectionLine(doc, y, "Estado vía aérea", normalized.airway_status ?? "", contentX, 2);
  if (normalized.glasgow) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `  Glasgow: E=${normalized.glasgow.E} V=${normalized.glasgow.V} M=${normalized.glasgow.M} → Total ${normalized.glasgow.puntaje_glasgow}`,
      contentX + 2,
      y + 2
    );
    y += LINE_HEIGHT + 2;
  }
  y += 2;
  drawSectionBlock(doc, signosStart, y, contentX);
  y += 8;

  // ─── 5. EVENTOS REGISTRADOS ────────────────────────────────────
  y = sectionTitle(doc, y, "5. EVENTOS REGISTRADOS (TIMESTAMPS)", contentX);
  y += 2;
  const eventos = normalized.timestamp_eventos ?? [];
  const tableBody = eventos.map((ev) => [
    new Date(ev.hora).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "medium" }),
    ev.evento,
  ]);
  autoTable(doc, {
    startY: y,
    head: [["Hora", "Evento"]],
    body: tableBody.length > 0 ? tableBody : [["—", "Ninguno"]],
    margin: { left: contentX },
    tableWidth: PAGE_W - contentX - MARGIN,
    theme: "grid",
    headStyles: { fillColor: [66, 66, 66], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    styles: { cellPadding: 2.5 },
  });

  const finalTableY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 18;
  y = finalTableY + 10;

  // ─── FIRMA Y SELLO ─────────────────────────────────────────────
  y = drawFirmaSello(doc, y, contentX);

  if (options?.reportId) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(140, 140, 140);
    doc.text(`ID: ${options.reportId}`, contentX, PAGE_H - 8);
  }
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado: ${new Date().toLocaleString("es-ES")}`, contentX, PAGE_H - 5);

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
