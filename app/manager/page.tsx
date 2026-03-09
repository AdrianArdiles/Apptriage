"use client";

import * as React from "react";
import useSWR from "swr";
import { getAtencionesFromApi, deleteAtencionApi } from "@/lib/api";
import type { AtencionFromApi } from "@/lib/types-atenciones-api";
import type { ReportSummaryData } from "@/lib/report-summary";
import { generateAndDownloadPDF } from "@/lib/share-pdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { NivelGravedad } from "@/lib/types";

const CARD_BG = "#1e293b";
const GOLD = "#eab308";
const RED_CRITICAL = "#dc2626";
const AMBER = "#f59e0b";
const GREEN = "#16a34a";
const SLATE_400 = "#94a3b8";
const BORDER = "rgba(51, 65, 85, 0.6)";

const NIVEL_LABELS: Record<NivelGravedad, string> = {
  1: "Verde",
  2: "Amarillo",
  3: "Naranja",
  4: "Rojo",
  5: "Rojo crítico",
};

function getNivelGravedad(a: AtencionFromApi): NivelGravedad {
  const n = a.data?.nivel_gravedad;
  if (n != null && n >= 1 && n <= 5) return n as NivelGravedad;
  return 3;
}

function triajeColor(nivel: NivelGravedad): { bg: string; text: string; glow: string } {
  switch (nivel) {
    case 5:
    case 4:
      return {
        bg: "rgba(220, 38, 38, 0.25)",
        text: "#fca5a5",
        glow: "0 0 12px rgba(220, 38, 38, 0.5)",
      };
    case 3:
    case 2:
      return {
        bg: "rgba(245, 158, 11, 0.25)",
        text: "#fcd34d",
        glow: "0 0 10px rgba(245, 158, 11, 0.4)",
      };
    default:
      return {
        bg: "rgba(22, 163, 74, 0.2)",
        text: "#86efac",
        glow: "0 0 8px rgba(22, 163, 74, 0.35)",
      };
  }
}

function isHoy(iso: string): boolean {
  const d = new Date(iso);
  const hoy = new Date();
  return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate();
}

function duracionMinutos(createdAt: string, horaInicio?: string): number | null {
  if (!horaInicio) return null;
  const fin = new Date(createdAt).getTime();
  const ini = new Date(horaInicio).getTime();
  if (Number.isNaN(fin) || Number.isNaN(ini) || ini > fin) return null;
  return Math.round((fin - ini) / 60000);
}

function exportToCSV(atenciones: AtencionFromApi[]): void {
  const headers = [
    "id",
    "createdAt",
    "nombrePaciente",
    "pacienteId",
    "dni",
    "operadorId",
    "unidadId",
    "nivel_gravedad",
    "sintomas_texto",
    "diagnostico_codigo",
    "hora_inicio",
    "glasgow_score",
    "ta",
    "pulso",
    "spo2",
  ];
  const rows = atenciones.map((a) => {
    const d = a.data ?? {};
    const sv = d.signos_vitales ?? {};
    return [
      a.id,
      a.createdAt,
      (a.nombrePaciente ?? "").replace(/"/g, '""'),
      a.pacienteId ?? "",
      (d.dni ?? "").replace(/"/g, '""'),
      a.operadorId ?? "",
      a.unidadId ?? "",
      String(d.nivel_gravedad ?? ""),
      (a.sintomas_texto ?? d.sintomas_texto ?? "").replace(/"/g, '""'),
      a.diagnostico_codigo ?? (d.diagnostico as { codigo_cie?: string } | undefined)?.codigo_cie ?? "",
      d.hora_inicio_atencion ?? "",
      String(d.glasgow_score ?? ""),
      sv.tensionArterial ?? (d.bp_systolic != null && d.bp_diastolic != null ? `${d.bp_systolic}/${d.bp_diastolic}` : ""),
      String(d.pulse ?? sv.frecuenciaCardiaca ?? ""),
      String(sv.saturacionOxigeno ?? ""),
    ].map((c) => `"${String(c)}"`).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `atenciones_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ManagerPage(): React.ReactElement {
  const { data: atenciones = [], mutate, isLoading, error } = useSWR<AtencionFromApi[]>(
    "atenciones",
    getAtencionesFromApi,
    { refreshInterval: 30_000 }
  );

  const [search, setSearch] = React.useState("");
  const [filterColor, setFilterColor] = React.useState<"todos" | "rojo" | "amarillo" | "verde">("todos");
  const [detail, setDetail] = React.useState<AtencionFromApi | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<AtencionFromApi | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [pdfLoading, setPdfLoading] = React.useState<string | null>(null);

  const filtrados = React.useMemo(() => {
    let list = atenciones;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          (a.nombrePaciente ?? "").toLowerCase().includes(q) ||
          (a.pacienteId ?? "").toLowerCase().includes(q) ||
          (a.data?.dni ?? "").toLowerCase().includes(q)
      );
    }
    if (filterColor !== "todos") {
      list = list.filter((a) => {
        const n = getNivelGravedad(a);
        if (filterColor === "rojo") return n === 4 || n === 5;
        if (filterColor === "amarillo") return n === 2 || n === 3;
        return n === 1;
      });
    }
    return list;
  }, [atenciones, search, filterColor]);

  const hoy = React.useMemo(() => atenciones.filter((a) => isHoy(a.createdAt)), [atenciones]);
  const rojosHoy = hoy.filter((a) => {
    const n = getNivelGravedad(a);
    return n === 4 || n === 5;
  });
  const pctRojos = hoy.length > 0 ? Math.round((rojosHoy.length / hoy.length) * 100) : 0;
  const duraciones = hoy
    .map((a) => duracionMinutos(a.createdAt, a.data?.hora_inicio_atencion))
    .filter((m): m is number => m != null && m >= 0);
  const promedioMin = duraciones.length > 0 ? Math.round(duraciones.reduce((s, x) => s + x, 0) / duraciones.length) : null;
  const operadoresHoy = React.useMemo(() => {
    const set = new Set<string>();
    hoy.forEach((a) => {
      const o = (a.operadorId ?? "").trim();
      if (o) set.add(o);
    });
    return set.size;
  }, [hoy]);

  const handleDelete = React.useCallback(async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm.atencionId;
    setDeleteConfirm(null);
    const ok = await deleteAtencionApi(id);
    if (ok.ok) void mutate();
  }, [deleteConfirm, mutate]);

  const handleExportCSV = React.useCallback(() => {
    setExporting(true);
    exportToCSV(atenciones);
    setExporting(false);
  }, [atenciones]);

  const handleDownloadPDF = React.useCallback(
    async (a: AtencionFromApi) => {
      setPdfLoading(a.id);
      try {
        const data: ReportSummaryData = {
          ...a.data,
          nombre_paciente: a.nombrePaciente,
          paciente_id: a.pacienteId,
          sintomas_texto: a.sintomas_texto ?? a.data?.sintomas_texto,
          diagnostico: a.data?.diagnostico ?? undefined,
        };
        await generateAndDownloadPDF(data);
      } catch (e) {
        console.warn("[Manager] PDF:", e);
      } finally {
        setPdfLoading(null);
      }
    },
    []
  );

  return (
    <>
      <h2 className="mb-1 text-xl font-bold text-white lg:text-2xl">
        Panel de Gestión — Atenciones (Neon)
      </h2>
      <p className="mb-6 text-sm text-slate-400">
        Visibilidad total sobre atenciones guardadas · Actualización cada 30 s
      </p>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-200">
          Error al cargar atenciones. Revisá la conexión.
        </div>
      )}

      {/* KPIs */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Atenciones hoy
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{hoy.length}</p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            % Triajes rojos (hoy)
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: RED_CRITICAL }}>
            {pctRojos}%
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Promedio tiempo atención
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {promedioMin != null ? `${promedioMin} min` : "—"}
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Operadores activos (hoy)
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: GOLD }}>
            {operadoresHoy}
          </p>
        </div>
      </section>

      {/* Filtros + Export CSV */}
      <section className="mb-4 flex flex-wrap items-center gap-4">
        <input
          type="search"
          placeholder="Buscar por nombre o DNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-[44px] min-w-[220px] flex-1 rounded-xl border-2 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          style={{ borderColor: BORDER }}
          aria-label="Buscar paciente"
        />
        <div className="flex flex-wrap gap-2">
          {(["todos", "rojo", "amarillo", "verde"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterColor(key)}
              className="min-h-[40px] rounded-lg border-2 px-3 py-2 text-xs font-semibold uppercase transition"
              style={{
                borderColor: filterColor === key ? (key === "rojo" ? RED_CRITICAL : key === "amarillo" ? AMBER : key === "verde" ? GREEN : GOLD) : BORDER,
                backgroundColor: filterColor === key ? (key === "rojo" ? "rgba(220,38,38,0.15)" : key === "amarillo" ? "rgba(245,158,11,0.15)" : key === "verde" ? "rgba(22,163,74,0.15)" : "rgba(234,179,8,0.1)") : "transparent",
                color: filterColor === key ? "white" : SLATE_400,
              }}
            >
              {key === "todos" ? "Todos" : key === "rojo" ? "Rojo" : key === "amarillo" ? "Amarillo" : "Verde"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={exporting || atenciones.length === 0}
          className="min-h-[44px] rounded-xl border-2 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ borderColor: GOLD, backgroundColor: "rgba(234, 179, 8, 0.2)" }}
        >
          {exporting ? "Exportando…" : "Exportar CSV global"}
        </button>
      </section>

      {/* Tabla táctica */}
      <section
        className="overflow-hidden rounded-xl border"
        style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
      >
        {isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center text-slate-400">
            Cargando atenciones…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-slate-600 text-slate-500"
              aria-hidden
            >
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="max-w-sm text-base font-medium text-slate-300">
              Esperando reportes de patrullas…
            </p>
            <p className="text-sm text-slate-500">
              {atenciones.length === 0
                ? "No hay atenciones en Neon. Los reportes aparecerán aquí al finalizar desde la app."
                : "Ninguna atención coincide con los filtros."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: BORDER }}>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-400">Triaje</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-400">Paciente / DNI</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-400">Fecha / Hora</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-400">Operador · Móvil</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-400">Diagnóstico</th>
                  <th className="px-4 py-3 text-right font-semibold uppercase tracking-wide text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a) => {
                  const nivel = getNivelGravedad(a);
                  const style = triajeColor(nivel);
                  const label = NIVEL_LABELS[nivel];
                  const diag = a.data?.diagnostico as { termino_comun?: string; codigo_cie?: string } | undefined;
                  return (
                    <tr
                      key={a.atencionId}
                      className="border-b border-slate-700/50 transition hover:bg-slate-700/20"
                    >
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex rounded-lg px-2.5 py-1 text-xs font-bold uppercase"
                          style={{
                            backgroundColor: style.bg,
                            color: style.text,
                            boxShadow: style.glow,
                          }}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{a.nombrePaciente || a.pacienteId || "—"}</p>
                        <p className="text-xs text-slate-500">{a.data?.dni ?? a.pacienteId ?? ""}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(a.createdAt).toLocaleString("es-ES", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {a.operadorId ?? "—"} {a.unidadId ? `· ${a.unidadId}` : ""}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-slate-400" title={diag?.termino_comun ?? ""}>
                        {diag?.termino_comun ?? a.diagnostico_codigo ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetail(a)}
                            className="min-h-[36px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                          >
                            Ver detalle
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(a)}
                            disabled={pdfLoading === a.id}
                            className="min-h-[36px] rounded-lg border border-amber-600/50 bg-amber-900/30 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-800/50 disabled:opacity-60"
                          >
                            {pdfLoading === a.id ? "…" : "PDF"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(a)}
                            className="min-h-[36px] rounded-lg border border-red-800/50 bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-800/50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal detalle */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent
          className="max-h-[90vh] max-w-2xl overflow-hidden border-slate-700 bg-slate-900 text-slate-100"
          style={{ backgroundColor: CARD_BG }}
        >
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg text-white">
                  {detail.nombrePaciente || detail.pacienteId || "Atención"} — {new Date(detail.createdAt).toLocaleString("es-ES")}
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
                <DetalleData data={detail.data} sintomasText={detail.sintomas_texto} />
              </div>
              <DialogFooter className="border-t border-slate-700 pt-4">
                <button
                  type="button"
                  onClick={() => { handleDownloadPDF(detail); setDetail(null); }}
                  className="min-h-[40px] rounded-lg border border-amber-600/50 bg-amber-900/30 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-800/50"
                >
                  Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="min-h-[40px] rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación eliminar */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="border-slate-700 bg-slate-900 text-slate-100" style={{ backgroundColor: CARD_BG }}>
          <DialogHeader>
            <DialogTitle className="text-white">¿Eliminar esta atención?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">
            Se borrará de Neon de forma permanente. Esta acción no se puede deshacer.
          </p>
          <DialogFooter className="gap-2 pt-4">
            <button
              type="button"
              onClick={() => setDeleteConfirm(null)}
              className="min-h-[40px] rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="min-h-[40px] rounded-lg border border-red-600 bg-red-900/80 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-800"
            >
              Eliminar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetalleData({
  data,
  sintomasText,
}: {
  data: AtencionFromApi["data"];
  sintomasText?: string;
}): React.ReactElement {
  const d = data ?? {};
  const sv = d.signos_vitales ?? {};
  const diag = d.diagnostico as { termino_comun?: string; codigo_cie?: string; descripcion_tecnica?: string } | undefined;

  return (
    <div className="space-y-4">
      {/* Signos vitales en rejilla */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Signos vitales
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Kv label="TA" value={sv.tensionArterial ?? (d.bp_systolic != null && d.bp_diastolic != null ? `${d.bp_systolic}/${d.bp_diastolic}` : "—")} />
          <Kv label="Pulso (lpm)" value={d.pulse ?? sv.frecuenciaCardiaca ?? "—"} />
          <Kv label="SpO₂" value={sv.saturacionOxigeno ?? "—"} />
          <Kv label="FR" value={d.respiration_rate ?? sv.frecuenciaRespiratoria ?? "—"} />
          <Kv label="Glasgow" value={d.glasgow_score ?? d.glasgow?.puntaje_glasgow ?? "—"} />
          <Kv label="Pérdida sangre" value={d.blood_loss ?? "—"} />
          <Kv label="Vía aérea" value={d.airway_status ?? "—"} />
        </div>
      </div>

      {/* Síntomas destacados */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Motivo / Observaciones
        </h3>
        <p className="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm text-slate-200">
          {(sintomasText ?? d.sintomas_texto ?? "").trim() || "—"}
        </p>
      </div>

      {/* Diagnóstico */}
      {diag && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Diagnóstico presuntivo (CIE-11)
          </h3>
          <div className="rounded-lg border border-slate-600 bg-slate-800/60 p-3 space-y-1">
            <p className="font-medium text-amber-200">{diag.termino_comun}</p>
            <p className="text-xs text-slate-400">Código: {diag.codigo_cie}</p>
            {diag.descripcion_tecnica && (
              <p className="text-xs text-slate-500">{diag.descripcion_tecnica}</p>
            )}
          </div>
        </div>
      )}

      {/* XABCDE resumido */}
      {d.xabcde && Object.keys(d.xabcde).length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            XABCDE
          </h3>
          <div className="flex flex-wrap gap-2">
            {["X", "A", "B", "C", "D", "E"].map((letra) => (
              <span
                key={letra}
                className="rounded bg-slate-700/80 px-2 py-1 text-xs font-mono text-slate-300"
              >
                {letra}: {(d.xabcde as Record<string, string>)[letra] ?? "—"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      {d.timestamp_eventos && d.timestamp_eventos.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Eventos
          </h3>
          <ul className="space-y-1 rounded-lg border border-slate-600 bg-slate-800/60 p-3 text-xs text-slate-300">
            {d.timestamp_eventos.map((ev, i) => (
              <li key={i}>
                {new Date(ev.hora).toLocaleTimeString("es-ES")} — {ev.evento}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hora inicio */}
      {d.hora_inicio_atencion && (
        <p className="text-xs text-slate-500">
          Inicio atención: {new Date(d.hora_inicio_atencion).toLocaleString("es-ES")}
        </p>
      )}
    </div>
  );
}

function Kv({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className="rounded border border-slate-600 bg-slate-800/50 px-2 py-1.5">
      <span className="text-[10px] uppercase text-slate-500">{label}</span>
      <p className="text-sm font-medium text-slate-200">{value ?? "—"}</p>
    </div>
  );
}
