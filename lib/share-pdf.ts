import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import QRCode from "qrcode";
import type { ReportSummaryData } from "@/lib/report-summary";
import { getPDFBase64, getPDFBlob } from "@/lib/pdf-export";
import { getLogoDataUrl } from "@/lib/logo-image";

const PDF_FILENAME_PREFIX = "Informe_AmbulanciaPro";

function generateReportId(): string {
  return `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function getPdfOptions(): Promise<{ logoDataUrl?: string; reportId: string; qrDataUrl?: string }> {
  const logoDataUrl = await getLogoDataUrl();
  const reportId = generateReportId();
  let qrDataUrl: string | undefined;
  try {
    qrDataUrl = await QRCode.toDataURL(reportId, { margin: 1, width: 140 });
  } catch {
    // sin QR si falla
  }
  return { logoDataUrl, reportId, qrDataUrl };
}

/**
 * Genera el PDF y lo guarda en caché (solo nativo). Devuelve la URI para abrir con FileOpener.
 * Útil para "VER" en historial cuando no hay fileUri guardado o el archivo fue borrado.
 * Si se pasa reportId (p. ej. entry.id del historial), el QR usará ese ID.
 */
export async function generatePDFAndGetUri(
  data: ReportSummaryData,
  existingReportId?: string
): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const reportId = existingReportId ?? generateReportId();
  let qrDataUrl: string | undefined;
  try {
    qrDataUrl = await QRCode.toDataURL(reportId, { margin: 1, width: 140 });
  } catch {
    // sin QR si falla
  }
  const logoDataUrl = await getLogoDataUrl();
  const pdfOptions = { logoDataUrl, reportId, qrDataUrl };
  const base64 = getPDFBase64(data, pdfOptions);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${PDF_FILENAME_PREFIX}_ver_${timestamp}.pdf`;
  const path = `informes/${filename}`;
  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });
  const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path });
  return uri;
}

/**
 * Genera el PDF con los datos actuales y lo comparte (Capacitor) o lo descarga (web).
 * En dispositivo nativo guarda el archivo con ruta única y devuelve su URI y reportId para el historial.
 */
export async function generateAndSharePDF(
  data: ReportSummaryData
): Promise<{ fileUri?: string; reportId: string }> {
  const pdfOptions = await getPdfOptions();

  if (Capacitor.isNativePlatform()) {
    const base64 = getPDFBase64(data, pdfOptions);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `${PDF_FILENAME_PREFIX}_${timestamp}.pdf`;
    const path = `informes/${filename}`;
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path });
    await Share.share({
      title: "Informe prehospitalario",
      text: "Informe de atención prehospitalaria - Ambulancia Pro",
      url: uri,
      dialogTitle: "Enviar informe al hospital",
    });
    return { fileUri: uri, reportId: pdfOptions.reportId };
  } else {
    const blob = getPDFBlob(data, pdfOptions);
    const url = URL.createObjectURL(blob);
    const filename = `${PDF_FILENAME_PREFIX}_${new Date().toISOString().slice(0, 10)}.pdf`;
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: "application/pdf" })] })) {
      try {
        await navigator.share({
          title: "Informe prehospitalario",
          text: "Informe de atención prehospitalaria - Ambulancia Pro",
          files: [new File([blob], filename, { type: "application/pdf" })],
        });
      } catch (e) {
        if ((e as Error).name !== "AbortError") fallbackDownload(url, filename);
      } finally {
        URL.revokeObjectURL(url);
      }
    } else {
      fallbackDownload(url, filename);
      URL.revokeObjectURL(url);
    }
    return { reportId: pdfOptions.reportId };
  }
}

function fallbackDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

/** Indica si el compartir nativo (Capacitor o Web Share) está disponible. */
export function canUseShare(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;
  return typeof navigator !== "undefined" && !!navigator.share;
}

/**
 * Genera el PDF y lo descarga en el navegador (sin intentar compartir). Para web cuando Share no está disponible.
 */
export async function generateAndDownloadPDF(data: ReportSummaryData): Promise<{ reportId: string }> {
  const pdfOptions = await getPdfOptions();
  const blob = getPDFBlob(data, pdfOptions);
  const url = URL.createObjectURL(blob);
  const filename = `${PDF_FILENAME_PREFIX}_${new Date().toISOString().slice(0, 10)}.pdf`;
  fallbackDownload(url, filename);
  URL.revokeObjectURL(url);
  return { reportId: pdfOptions.reportId };
}

/**
 * Genera el PDF y opcionalmente comparte o descarga. No lanza errores bloqueantes; devuelve error en el resultado.
 */
export async function generateAndSharePDFSafe(
  data: ReportSummaryData
): Promise<{ fileUri?: string; reportId: string; error?: string }> {
  try {
    const result = await generateAndSharePDF(data);
    return { fileUri: result.fileUri, reportId: result.reportId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al generar o compartir PDF";
    console.warn("[PDF]", msg);
    return { reportId: `pdf-${Date.now()}`, error: msg };
  }
}
