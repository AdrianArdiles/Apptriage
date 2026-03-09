import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getOperadorId, getUnidadId, getAtendidoPor } from "@/lib/operador-storage";
import type { ReportSummaryData } from "@/lib/report-summary";

const TITLE = "HISTORIA CLÍNICA PREHOSPITALARIA";
const SUBTITLE = "AMBULANCIA PRO";
const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const LINE_HEIGHT = 5;
const LOGO_HEIGHT_MM = 10;
const LOGO_WIDTH_MM = 24;
const BANDA_ROJA_ANCHO = 5;
const QR_SIZE_MM = 18;
const N_R = "N/R";
const BLUE_DARK: [number, number, number] = [30, 58, 138];
const SECTION_BG: [number, number, number] = [248, 249, 250];
const SECTION_BORDER: [number, number, number] = [226, 232, 240];

export type PDFExportOptions = {
  logoDataUrl?: string;
  reportId?: string;
  qrDataUrl?: string;
};

function getContentX(esNivelRojo: boolean): number {
  return MARGIN + (esNivelRojo ? BANDA_ROJA_ANCHO : 0);
}

function drawHeaderDivider(doc: jsPDF, y: number, contentX: number): number {
  doc.setDrawColor(...BLUE_DARK);
  doc.setLineWidth(0.8);
  doc.line(contentX, y, PAGE_W - MARGIN, y);
  return y + 5;
}

function sectionTitleWithBg(doc: jsPDF, y: number, text: string, contentX: number): number {
  const w = PAGE_W - contentX - MARGIN;
  const titleH = 8;
  doc.setFillColor(...SECTION_BG);
  doc.setDrawColor(...SECTION_BORDER);
  doc.setLineWidth(0.2);
  doc.rect(contentX, y - 5, w, titleH, "FD");
  doc.rect(contentX, y - 5, w, titleH, "S");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(text, contentX + 3, y + 0.5);
  return y + titleH - 2;
}

function sectionLine(doc: jsPDF, y: number, label: string, value: string, contentX: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const text = value?.trim() ? `${label}: ${value}` : `${label}: —`;
  doc.text(text, contentX + 3, y);
  return y + LINE_HEIGHT;
}

function drawBandaRoja(doc: jsPDF): void {
  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, BANDA_ROJA_ANCHO, PAGE_H, "F");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("NIVEL 1", 1, 20);
  doc.text("ROJO", 1, 25);
}

function drawFirmaPie(doc: jsPDF, y: number, contentX: number, reportId?: string): number {
  const x = contentX + 2;
  const w = 75;
  const h = 26;
  doc.setDrawColor(...SECTION_BORDER);
  doc.setLineWidth(0.3);
  doc.setFillColor(252, 252, 252);
  doc.rect(x, y, w, h, "FD");
  doc.rect(x, y, w, h, "S");

  const atendidoPor = getAtendidoPor() || getOperadorId() || "Paramédico";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const lines = doc.splitTextToSize(atendidoPor, w - 6);
  doc.text(lines, x + 4, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text("Firma digital · Matrícula / ID operador", x + 4, y + 16);
  doc.text("Documento generado electrónicamente", x + 4, y + 21);
  if (reportId) doc.text(`ID: ${reportId}`, x + 4, y + 25);

  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Este documento tiene validez legal como registro de atención prehospitalaria.", contentX, y + h + 6);
  return y + h + 12;
}

function normalizeReportData(data: ReportSummaryData): ReportSummaryData & { edad?: string; genero?: string; glucosa?: string } {
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
    edad: (d.edad as string) ?? undefined,
    genero: (d.genero as string) ?? undefined,
    glucosa: (d.glucosa as string) ?? undefined,
  };
}

/**
 * Genera el PDF como Historia Clínica Prehospitalaria: estructura clínica, secciones con fondo,
 * tabla de signos vitales, Glasgow, CIE-11 destacado, observaciones y pie legal.
 */
export function exportToPDF(data: ReportSummaryData, options?: PDFExportOptions): jsPDF {
  const n = normalizeReportData(data);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const esNivelRojo = n.nivel_gravedad === 5;
  if (esNivelRojo) drawBandaRoja(doc);

  let y = 14;
  const contentX = getContentX(esNivelRojo);

  if (options?.qrDataUrl) {
    try {
      doc.addImage(options.qrDataUrl, "PNG", PAGE_W - MARGIN - QR_SIZE_MM, y, QR_SIZE_MM, QR_SIZE_MM);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Validación", PAGE_W - MARGIN - QR_SIZE_MM, y + QR_SIZE_MM + 2.5);
    } catch {
      // sin QR si falla
    }
  }

  if (options?.logoDataUrl) {
    doc.addImage(options.logoDataUrl, "PNG", contentX, y, LOGO_WIDTH_MM, LOGO_HEIGHT_MM);
    y += LOGO_HEIGHT_MM + 2;
  } else {
    y += 2;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(TITLE, contentX, y);
  y += 5;
  doc.setFontSize(11);
  doc.setTextColor(...BLUE_DARK);
  doc.text(SUBTITLE, contentX, y);
  y += 5;
  y = drawHeaderDivider(doc, y, contentX);
  y += 4;

  // ─── 1. DATOS DEL PACIENTE ──────────────────────────────────────
  y = sectionTitleWithBg(doc, y, "1. DATOS DEL PACIENTE", contentX);
  y += 2;
  y = sectionLine(doc, y, "Nombre completo", n.nombre_paciente?.trim() ?? "", contentX);
  y = sectionLine(doc, y, "DNI / ID", [n.dni, n.paciente_id].filter(Boolean).join(" · ") || "", contentX);
  y = sectionLine(doc, y, "Edad", (n as { edad?: string }).edad?.trim() ?? N_R, contentX);
  y = sectionLine(doc, y, "Género", (n as { genero?: string }).genero?.trim() ?? N_R, contentX);
  y = sectionLine(doc, y, "Nº historia / Identificador", n.paciente_id ?? N_R, contentX);
  y += 4;

  // ─── 2. SIGNOS VITALES (tabla/cajas) ────────────────────────────
  y = sectionTitleWithBg(doc, y, "2. SIGNOS VITALES", contentX);
  y += 3;
  const sv = n.signos_vitales ?? {};
  const ta = sv.tensionArterial ?? (n.bp_systolic != null && n.bp_diastolic != null ? `${n.bp_systolic}/${n.bp_diastolic}` : null);
  const fc = sv.frecuenciaCardiaca ?? n.pulse;
  const fr = sv.frecuenciaRespiratoria ?? n.respiration_rate;
  const sat = sv.saturacionOxigeno;
  const temp = sv.temperatura;
  const glucosa = (n as { glucosa?: string }).glucosa;

  const vitalLabels = [
    ["TA (mmHg)", ta ?? N_R],
    ["FC (lpm)", fc != null ? String(fc) : N_R],
    ["FR (/min)", fr != null ? String(fr) : N_R],
    ["SatO₂ (%)", sat != null ? String(sat) : N_R],
    ["Temp (°C)", temp != null ? String(temp) : N_R],
    ["Glucosa", glucosa?.trim() ?? N_R],
  ];
  const colW = (PAGE_W - contentX - MARGIN - 2) / 6;
  const boxH = 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  vitalLabels.forEach(([label], i) => {
    const x = contentX + 2 + i * (colW + 0.3);
    doc.setFillColor(...SECTION_BG);
    doc.rect(x, y - 3, colW, 4, "FD");
    doc.text(label, x + 1, y + 0.5);
  });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  vitalLabels.forEach(([, value], i) => {
    const x = contentX + 2 + i * (colW + 0.3);
    doc.setDrawColor(...SECTION_BORDER);
    doc.rect(x, y - 2, colW, boxH, "S");
    doc.text(String(value).slice(0, 8), x + 2, y + 3);
  });
  y += boxH + 5;

  // ─── 3. EVALUACIÓN NEUROLÓGICA (Glasgow) ─────────────────────────
  y = sectionTitleWithBg(doc, y, "3. EVALUACIÓN NEUROLÓGICA — ESCALA DE GLASGOW (GCS)", contentX);
  y += 2;
  if (n.glasgow) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`  Ocular (E): ${n.glasgow.E}   ·   Verbal (V): ${n.glasgow.V}   ·   Motor (M): ${n.glasgow.M}   →   Total GCS: ${n.glasgow.puntaje_glasgow}`, contentX + 3, y + 2);
    y += LINE_HEIGHT + 4;
  } else if (n.glasgow_score != null) {
    doc.text(`  Puntaje Glasgow: ${n.glasgow_score}`, contentX + 3, y + 2);
    y += LINE_HEIGHT + 4;
  } else {
    doc.text("  No registrado.", contentX + 3, y + 2);
    y += LINE_HEIGHT + 4;
  }

  // ─── 4. DIAGNÓSTICO Y OBSERVACIONES ───────────────────────────
  y = sectionTitleWithBg(doc, y, "4. DIAGNÓSTICO Y OBSERVACIONES", contentX);
  y += 2;

  const diag = n.impresion_clinica ?? (n.diagnostico ? { nombre: n.diagnostico.termino_comun, cie11: n.diagnostico.codigo_cie ?? "" } : null);
  if (diag) {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(148, 163, 184);
    doc.rect(contentX + 2, y - 1, PAGE_W - contentX - MARGIN - 4, 14, "FD");
    doc.rect(contentX + 2, y - 1, PAGE_W - contentX - MARGIN - 4, 14, "S");
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text(`CIE-11: ${diag.cie11 || N_R}`, contentX + 5, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(diag.nombre?.trim() ?? "", contentX + 5, y + 10);
    y += 16;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Observaciones / Síntomas", contentX + 3, y + 2);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const sintomas = n.sintomas_texto?.trim() || "—";
  const sintomasLines = doc.splitTextToSize(sintomas, PAGE_W - contentX - MARGIN - 6);
  doc.text(sintomasLines, contentX + 3, y + 2);
  y += sintomasLines.length * LINE_HEIGHT + 4;

  // ─── 5. EVALUACIÓN XABCDE (resumida) ───────────────────────────
  y = sectionTitleWithBg(doc, y, "5. EVALUACIÓN XABCDE", contentX);
  y += 2;
  const xabcdeItems = ["X", "A", "B", "C", "D", "E"];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const xabcdeLine = xabcdeItems.map((l) => `${l}:${(n.xabcde?.[l] ?? "—").toUpperCase()}`).join("   ");
  doc.text(xabcdeLine, contentX + 3, y + 2);
  y += 8;

  // ─── 6. OTROS DATOS CLÍNICOS ───────────────────────────────────
  y = sectionTitleWithBg(doc, y, "6. OTROS DATOS CLÍNICOS", contentX);
  y += 2;
  y = sectionLine(doc, y, "Pérdida de sangre", n.blood_loss ?? N_R, contentX);
  y = sectionLine(doc, y, "Vía aérea", n.airway_status ?? N_R, contentX);
  y = sectionLine(doc, y, "Hora de inicio", n.hora_inicio_atencion ? new Date(n.hora_inicio_atencion).toLocaleString("es-ES") : N_R, contentX);
  y = sectionLine(doc, y, "Operador / Unidad", [getOperadorId(), getUnidadId()].filter(Boolean).join(" · ") || N_R, contentX);
  y += 4;

  // ─── 7. LÍNEA DE TIEMPO DE EVENTOS (compacta) ──────────────────
  y = sectionTitleWithBg(doc, y, "7. LÍNEA DE TIEMPO DE EVENTOS", contentX);
  y += 2;
  const eventos = n.timestamp_eventos ?? [];
  const tableBody = eventos.map((ev) => [
    new Date(ev.hora).toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    ev.evento,
  ]);
  autoTable(doc, {
    startY: y,
    head: [["Hora", "Evento"]],
    body: tableBody.length > 0 ? tableBody : [["—", "Ninguno"]],
    margin: { left: contentX },
    tableWidth: PAGE_W - contentX - MARGIN,
    theme: "plain",
    headStyles: { fillColor: SECTION_BG, textColor: [30, 41, 59], fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
    styles: { cellPadding: 1.5 },
  });
  const tableEndY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 12;
  y = tableEndY + 6;

  // ─── FIRMA Y PIE LEGAL ──────────────────────────────────────────
  y = drawFirmaPie(doc, y, contentX, options?.reportId);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generado: ${new Date().toLocaleString("es-ES")}`, contentX, PAGE_H - 5);

  return doc;
}

export function getPDFBlob(data: ReportSummaryData, options?: PDFExportOptions): Blob {
  const doc = exportToPDF(data, options);
  return doc.output("blob");
}

export function getPDFBase64(data: ReportSummaryData, options?: PDFExportOptions): string {
  const doc = exportToPDF(data, options);
  return doc.output("datauristring").split(",")[1] ?? "";
}
