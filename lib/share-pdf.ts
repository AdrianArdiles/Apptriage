import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { ReportSummaryData } from "@/lib/report-summary";
import { getPDFBase64, getPDFBlob } from "@/lib/pdf-export";
import { getLogoDataUrl } from "@/lib/logo-image";

const PDF_FILENAME_PREFIX = "Informe_AmbulanciaPro";

/**
 * Genera el PDF y lo guarda en caché (solo nativo). Devuelve la URI para abrir con FileOpener.
 * Útil para "VER" en historial cuando no hay fileUri guardado o el archivo fue borrado.
 */
export async function generatePDFAndGetUri(data: ReportSummaryData): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const logoDataUrl = await getLogoDataUrl();
  const pdfOptions = logoDataUrl ? { logoDataUrl } : undefined;
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
 * En dispositivo nativo guarda el archivo con ruta única y devuelve su URI para el historial.
 */
export async function generateAndSharePDF(data: ReportSummaryData): Promise<{ fileUri?: string }> {
  const logoDataUrl = await getLogoDataUrl();
  const pdfOptions = logoDataUrl ? { logoDataUrl } : undefined;

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
    return { fileUri: uri };
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
    return {};
  }
}

function fallbackDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
