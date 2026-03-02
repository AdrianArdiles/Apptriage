"use client";

import * as React from "react";
import { getAtencionesFromFirebase, type AtencionFirebaseEntry } from "@/lib/firebase-atenciones";
import { getPDFBlob } from "@/lib/pdf-export";
import { getLogoDataUrl } from "@/lib/logo-image";

const CARD_BG = "#1e293b";
const BORDER_SUBTLE = "rgba(51, 65, 85, 0.6)";
const GOLD = "#eab308";

function escapeCsvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function atencionesToCsv(rows: AtencionFirebaseEntry[]): string {
  const headers = [
    "id",
    "createdAt",
    "nombrePaciente",
    "pacienteId",
    "operadorId",
    "unidadId",
    "sintomas_texto",
    "glasgow_score",
    "hora_inicio_atencion",
  ];
  const lines = [headers.map(escapeCsvCell).join(",")];
  rows.forEach((e) => {
    const data = e.data || {};
    lines.push(
      [
        e.id,
        e.createdAt,
        e.nombrePaciente,
        e.pacienteId,
        e.operadorId,
        e.unidadId,
        (data as { sintomas_texto?: string }).sintomas_texto,
        (data as { glasgow_score?: number }).glasgow_score,
        (data as { hora_inicio_atencion?: string }).hora_inicio_atencion,
      ].map(escapeCsvCell).join(",")
    );
  });
  return lines.join("\r\n");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ManagerExportarPage(): React.ReactElement {
  const [atenciones, setAtenciones] = React.useState<AtencionFirebaseEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [exportingPdf, setExportingPdf] = React.useState(false);

  React.useEffect(() => {
    getAtencionesFromFirebase().then(setAtenciones).finally(() => setLoading(false));
  }, []);

  const handleExportCsv = () => {
    const csv = atencionesToCsv(atenciones);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const filename = `atenciones_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadBlob(blob, filename);
  };

  const handleExportPdfMasivo = async () => {
    if (atenciones.length === 0) {
      alert("No hay atenciones para exportar.");
      return;
    }
    setExportingPdf(true);
    const logoDataUrl = await getLogoDataUrl();
    const options = logoDataUrl ? { logoDataUrl } : undefined;
    for (let i = 0; i < atenciones.length; i++) {
      const e = atenciones[i];
      try {
        const blob = getPDFBlob(e.data, options);
        const safeName = (e.nombrePaciente || e.pacienteId || "informe").replace(/[^\w\u00C0-\u024F\-_.]/g, "_");
        const filename = `Informe_${e.createdAt.slice(0, 10)}_${safeName}.pdf`;
        downloadBlob(blob, filename);
        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        console.error("Error generando PDF:", err);
      }
    }
    setExportingPdf(false);
    alert(`Se han generado ${atenciones.length} PDF(s). Comprruebe las descargas del navegador.`);
  };

  if (loading) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: CARD_BG, borderColor: BORDER_SUBTLE }}>
        <p className="text-slate-400">Cargando historial…</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-2 text-xl font-bold text-white lg:text-2xl">Exportación de datos</h2>
      <p className="mb-6 text-sm text-slate-400">
        Exportar historial de atenciones a CSV/Excel y descargar PDFs masivamente.
      </p>

      <div className="mb-6 rounded-xl border p-4" style={{ backgroundColor: CARD_BG, borderColor: BORDER_SUBTLE }}>
        <p className="text-slate-300">
          Total de atenciones en Firebase: <strong className="text-white">{atenciones.length}</strong>
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={atenciones.length === 0}
          className="min-h-[48px] rounded-xl border-2 px-6 py-3 text-sm font-semibold transition disabled:opacity-50"
          style={{
            borderColor: GOLD,
            color: GOLD,
          }}
        >
          Exportar a CSV / Excel
        </button>
        <button
          type="button"
          onClick={handleExportPdfMasivo}
          disabled={atenciones.length === 0 || exportingPdf}
          className="min-h-[48px] rounded-xl border-2 px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
          style={{
            backgroundColor: GOLD,
            borderColor: GOLD,
            color: "#0f172a",
          }}
        >
          {exportingPdf ? "Generando PDFs…" : "Descargar todos los PDFs"}
        </button>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        CSV: compatible con Excel. PDFs: se descargará un archivo por cada atención; acepte las descargas en el navegador.
      </p>
    </>
  );
}
