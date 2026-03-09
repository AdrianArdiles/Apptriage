import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import QRCode from "qrcode";
import type { ReportSummaryData } from "@/lib/report-summary";
import { getPDFBase64, getPDFBlob } from "@/lib/pdf-export";
import { getLogoDataUrl } from "@/lib/logo-image";

const PDF_FILENAME_PREFIX = "Informe_AmbulanciaPro";
const CACHE_SUBDIR = "informes";

/** Mensaje cuando falla generación/compartir PDF (los datos ya están guardados en Neon). */
export const PDF_ERROR_MENSAJE_DATOS_GUARDADOS =
  "No se pudo generar el archivo, pero los datos ya están en la base de datos.";

/** Última ruta de PDF escrita en Cache; para borrar antes de generar uno nuevo y no llenar memoria. */
let lastPdfPathInCache: string | null = null;

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
 * Intenta borrar el PDF anterior en Cache para no acumular archivos temporales.
 * No lanza; si falla (ej. no existe) se ignora.
 */
async function deletePreviousPdfInCache(): Promise<void> {
  if (!lastPdfPathInCache) return;
  try {
    await Filesystem.deleteFile({
      directory: Directory.Cache,
      path: lastPdfPathInCache,
    });
  } catch {
    // Archivo ya borrado o ruta inválida; ignorar
  } finally {
    lastPdfPathInCache = null;
  }
}

/**
 * Genera el PDF y lo guarda en Directory.Cache (solo nativo).
 * Devuelve la URI para abrir con FileOpener. Try/catch riguroso: ante cualquier fallo devuelve null.
 */
export async function generatePDFAndGetUri(
  data: ReportSummaryData,
  existingReportId?: string
): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
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
    const path = `${CACHE_SUBDIR}/${filename}`;

    await deletePreviousPdfInCache();

    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    lastPdfPathInCache = path;

    const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path });
    return uri;
  } catch (e) {
    console.warn("[PDF] generatePDFAndGetUri:", e);
    return null;
  }
}

/**
 * Genera el PDF y lo comparte (Capacitor: Cache + Share) o lo descarga (web).
 * Todo Filesystem y Share envuelto en try/catch; lanza solo si algo falla para que el caller muestre toast.
 */
export async function generateAndSharePDF(
  data: ReportSummaryData
): Promise<{ fileUri?: string; reportId: string }> {
  const pdfOptions = await getPdfOptions();

  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = getPDFBase64(data, pdfOptions);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `${PDF_FILENAME_PREFIX}_${timestamp}.pdf`;
      const path = `${CACHE_SUBDIR}/${filename}`;

      await deletePreviousPdfInCache();

      await Filesystem.writeFile({
        path,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });
      lastPdfPathInCache = path;

      const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path });

      await Share.share({
        title: "Informe prehospitalario",
        text: "Informe de atención prehospitalaria - Ambulancia Pro",
        url: uri,
        dialogTitle: "Enviar informe al hospital",
      });
      return { fileUri: uri, reportId: pdfOptions.reportId };
    } catch (e) {
      console.warn("[PDF] generateAndSharePDF (nativo):", e);
      throw e;
    }
  }

  try {
    const blob = getPDFBlob(data, pdfOptions);
    const url = URL.createObjectURL(blob);
    const filename = `${PDF_FILENAME_PREFIX}_${new Date().toISOString().slice(0, 10)}.pdf`;
    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      navigator.canShare?.({ files: [new File([blob], filename, { type: "application/pdf" })] })
    ) {
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
  } catch (e) {
    console.warn("[PDF] generateAndSharePDF (web):", e);
    throw e;
  }
}

function fallbackDownload(url: string, filename: string): void {
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  } catch {
    // ignorar si el entorno no permite descarga
  }
}

/** Indica si el compartir nativo (Capacitor o Web Share) está disponible. */
export function canUseShare(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;
  return typeof navigator !== "undefined" && !!navigator.share;
}

/**
 * Genera el PDF y lo descarga en el navegador (sin compartir). Try/catch: no debe bloquear.
 */
export async function generateAndDownloadPDF(data: ReportSummaryData): Promise<{ reportId: string }> {
  try {
    const pdfOptions = await getPdfOptions();
    const blob = getPDFBlob(data, pdfOptions);
    const url = URL.createObjectURL(blob);
    const filename = `${PDF_FILENAME_PREFIX}_${new Date().toISOString().slice(0, 10)}.pdf`;
    fallbackDownload(url, filename);
    URL.revokeObjectURL(url);
    return { reportId: pdfOptions.reportId };
  } catch (e) {
    console.warn("[PDF] generateAndDownloadPDF:", e);
    throw e;
  }
}

/**
 * Genera el PDF y comparte o descarga. NUNCA lanza: devuelve error en el resultado.
 * Si falla escritura o Share, el caller debe mostrar el toast y seguir (resetForm + redirección).
 */
export async function generateAndSharePDFSafe(
  data: ReportSummaryData
): Promise<{ fileUri?: string; reportId: string; error?: string }> {
  try {
    const result = await generateAndSharePDF(data);
    return { fileUri: result.fileUri, reportId: result.reportId };
  } catch (e) {
    console.warn("[PDF]", e);
    return {
      reportId: `pdf-${Date.now()}`,
      error: PDF_ERROR_MENSAJE_DATOS_GUARDADOS,
    };
  }
}
