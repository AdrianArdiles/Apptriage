import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { ReportSummaryData } from "@/lib/report-summary";
import { getPDFBase64, getPDFBlob } from "@/lib/pdf-export";
import { getLogoDataUrl } from "@/lib/logo-image";

const PDF_FILENAME = `Informe_AmbulanciaPro_${new Date().toISOString().slice(0, 10)}.pdf`;

/**
 * Genera el PDF con los datos actuales y lo comparte (Capacitor) o lo descarga (web).
 * En dispositivo nativo usa @capacitor/share para que el paramédico pueda enviarlo por WhatsApp, etc.
 */
export async function generateAndSharePDF(data: ReportSummaryData): Promise<void> {
  const logoDataUrl = await getLogoDataUrl();
  const pdfOptions = logoDataUrl ? { logoDataUrl } : undefined;

  if (Capacitor.isNativePlatform()) {
    const base64 = getPDFBase64(data, pdfOptions);
    const path = `informes/${PDF_FILENAME}`;
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
  } else {
    const blob = getPDFBlob(data, pdfOptions);
    const url = URL.createObjectURL(blob);
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [new File([blob], PDF_FILENAME, { type: "application/pdf" })] })) {
      try {
        await navigator.share({
          title: "Informe prehospitalario",
          text: "Informe de atención prehospitalaria - Ambulancia Pro",
          files: [new File([blob], PDF_FILENAME, { type: "application/pdf" })],
        });
      } catch (e) {
        if ((e as Error).name !== "AbortError") fallbackDownload(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    } else {
      fallbackDownload(url);
      URL.revokeObjectURL(url);
    }
  }
}

function fallbackDownload(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = PDF_FILENAME;
  a.click();
}
