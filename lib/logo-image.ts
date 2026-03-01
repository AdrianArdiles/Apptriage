import { LOGO_EKG_SVG_STRING } from "@/components/logo-ekg";

/**
 * Convierte el logo EKG (SVG) en una imagen PNG como data URL, para incrustar en el PDF.
 * Solo funciona en el navegador (usa document, Image, canvas).
 */
export function getLogoDataUrl(): Promise<string> {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return Promise.resolve("");
  }
  return new Promise((resolve) => {
    const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(LOGO_EKG_SVG_STRING)}`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = 160;
      const h = 160;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("");
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve("");
      }
    };
    img.onerror = () => resolve("");
    img.src = svgDataUrl;
  });
}
