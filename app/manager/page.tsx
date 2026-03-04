"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { getHistorialPdfList, type HistorialPdfEntry } from "@/lib/historial-pdf-storage";
import {
  subscribeIntervenciones,
  type IntervencionPayload,
} from "@/lib/firebase-intervenciones";
import { sendMensaje, subscribeAllMensajes, type MensajePayload } from "@/lib/firebase-mensajes";

const ManagerMap = dynamic(
  () => import("@/components/manager-map").then((m) => ({ default: m.ManagerMap })),
  { ssr: false, loading: () => <div className="h-[320px] rounded-xl border border-slate-600 bg-slate-800 flex items-center justify-center text-slate-400">Cargando mapa…</div> }
);

const CARD_BG = "#1e293b";
const GOLD = "#eab308";
const GOLD_DIM = "rgba(234, 179, 8, 0.2)";
const RED_CRITICAL = "#dc2626";
const ORANGE_WARNING = "#ea580c";
const GREEN_READY = "#16a34a";
const BLUE_BASE = "#2563eb";

const STEP_LABELS: Record<number, string> = {
  0: "Inicio",
  1: "X",
  2: "A",
  3: "B",
  4: "C",
  5: "D",
  6: "E",
  7: "Signos vitales",
  8: "Glasgow",
  9: "Timestamps",
  10: "Paciente",
  11: "Enviar",
};

export default function ManagerPage(): React.ReactElement {
  const [list, setList] = React.useState<HistorialPdfEntry[]>([]);
  const [liveIntervenciones, setLiveIntervenciones] = React.useState<
    Record<string, IntervencionPayload>
  >({});
  const [filterUnidad, setFilterUnidad] = React.useState<string>("");
  const [filterOperador, setFilterOperador] = React.useState<string>("");
  const [mensajeDraft, setMensajeDraft] = React.useState<Record<string, string>>({});
  const [liveMensajes, setLiveMensajes] = React.useState<Record<string, MensajePayload>>({});
  const [firebaseError, setFirebaseError] = React.useState<string | null>(null);

  const PRESETS = [
    { label: "HOSPITAL LISTO", text: "[HOSPITAL LISTO]", color: GREEN_READY },
    { label: "DIRIGIRSE A BASE", text: "[DIRIGIRSE A BASE]", color: BLUE_BASE },
    { label: "CANCELAR AUXILIO", text: "[CANCELAR AUXILIO]", color: RED_CRITICAL },
    { label: "CONFIRMAR ESTADO", text: "[CONFIRMAR ESTADO]", color: ORANGE_WARNING },
  ] as const;

  React.useEffect(() => {
    setList(getHistorialPdfList());
  }, []);

  React.useEffect(() => {
    const unsubscribe = subscribeIntervenciones(
      (data) => {
        setFirebaseError(null);
        setLiveIntervenciones(data ?? {});
      },
      (err) => setFirebaseError(err?.message ?? "Error de conexión Firebase")
    );
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    const unsub = subscribeAllMensajes((data) => {
      setLiveMensajes(data ?? {});
    });
    return unsub;
  }, []);

  const liveEntries = React.useMemo(() => {
    return Object.entries(liveIntervenciones).map(([key, payload]) => ({ key, ...payload }));
  }, [liveIntervenciones]);

  const unidades = React.useMemo(() => {
    const set = new Set<string>();
    list.forEach((e) => {
      const u = e.unidadId?.trim();
      if (u) set.add(u);
    });
    return Array.from(set).sort();
  }, [list]);

  const operadores = React.useMemo(() => {
    const set = new Set<string>();
    list.forEach((e) => {
      const o = e.operadorId?.trim();
      if (o) set.add(o);
    });
    return Array.from(set).sort();
  }, [list]);

  const filtrados = React.useMemo(() => {
    let result = list;
    if (filterUnidad) {
      result = result.filter((e) => (e.unidadId ?? "").trim() === filterUnidad);
    }
    if (filterOperador) {
      result = result.filter((e) => (e.operadorId ?? "").trim() === filterOperador);
    }
    return result;
  }, [list, filterUnidad, filterOperador]);

  return (
    <>
      <h2 className="mb-2 text-xl font-bold text-white lg:text-2xl">Monitor en Vivo</h2>
      <p className="mb-6 text-sm text-slate-400">Monitorización en tiempo real · Unidades activas y mensajería</p>

      {firebaseError && (
        <div role="alert" className="mb-4">
          <p className="rounded-lg border border-red-800 bg-red-900/40 px-3 py-2 text-sm text-red-200">
            Conexión Firebase: {firebaseError}
          </p>
        </div>
      )}

      {/* Tarjetas de resumen */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: CARD_BG, borderColor: GOLD_DIM }}
        >
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-slate-400">
            Reportes en dispositivo
          </h2>
          <p className="text-3xl font-bold" style={{ color: GOLD }}>
            {list.length}
          </p>
          <p className="mt-1 text-sm text-slate-400">guardados en memoria local</p>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: CARD_BG, borderColor: GOLD_DIM }}
        >
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-slate-400">
            Unidades activas ahora
          </h2>
          <p className="text-3xl font-bold" style={{ color: GOLD }}>
            {liveEntries.length}
          </p>
          <p className="mt-1 text-sm text-slate-400">sincronizando con Firebase</p>
        </div>
      </section>

      {/* Panel expandido Web: 60% mapa + 40% alertas/cuadrillas */}
      <div className="mb-8 grid gap-6 lg:grid-cols-5 lg:min-h-[70vh]">
        {/* Mapa: 60% en escritorio */}
        <div className="lg:col-span-3 flex flex-col min-h-[320px] lg:min-h-full">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
            Ubicación en tiempo real
          </h2>
          <div className="flex-1 min-h-[320px] lg:min-h-0 rounded-xl border border-amber-500/30 overflow-hidden bg-slate-800/50">
            {liveEntries.length > 0 ? (
              <ManagerMap entries={liveEntries} className="h-full min-h-[320px] lg:min-h-[400px]" />
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center text-slate-400">
                No hay unidades con ubicación. El mapa se actualizará en tiempo real.
              </div>
            )}
          </div>
        </div>

        {/* Lista alertas/cuadrillas: 40% en escritorio */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
            Unidades activas en la calle
          </h2>
          {/* Tabla de intervenciones en tiempo real: triage (color) + CIE-11 */}
          {liveEntries.length > 0 && (
            <div className="mb-4 overflow-x-auto rounded-xl border border-slate-600/50" style={{ backgroundColor: CARD_BG }}>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-600/70">
                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-slate-400">Unidad</th>
                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-slate-400">Paciente</th>
                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-slate-400">Paso</th>
                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-slate-400">Nivel</th>
                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-slate-400">CIE-11</th>
                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-slate-400">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody>
                  {liveEntries.map((entry) => {
                    const stepLabel = STEP_LABELS[entry.currentStep ?? 0] ?? `Paso ${entry.currentStep}`;
                    const isCritical = entry.hasRCP === true;
                    const diag = entry.diagnostico_presuntivo;
                    const nivelLabel = isCritical ? "RCP" : "En curso";
                    const nivelColor = isCritical ? RED_CRITICAL : GOLD;
                    const nivelStyle = {
                      backgroundColor: isCritical ? "rgba(220, 38, 38, 0.25)" : GOLD_DIM,
                      color: nivelColor,
                    };
                    return (
                      <tr key={entry.key} className="border-b border-slate-600/50 hover:bg-slate-700/30 transition-colors">
                        <td className="px-3 py-2 font-mono text-slate-200">{entry.unidadId || entry.operadorId || "—"}</td>
                        <td className="px-3 py-2 text-slate-200">{entry.nombre_paciente || entry.paciente_id || "—"}</td>
                        <td className="px-3 py-2 text-slate-300">{stepLabel}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex rounded px-2 py-0.5 text-xs font-bold uppercase" style={nivelStyle}>
                            {nivelLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-amber-400">{diag?.codigo_cie ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-300 max-w-[140px] truncate" title={diag?.termino_comun ?? ""}>{diag?.termino_comun ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex-1 overflow-y-auto rounded-xl border border-slate-600/50 space-y-3 pr-1" style={{ backgroundColor: CARD_BG }}>
            {liveEntries.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-400">
                  No hay intervenciones activas. Las unidades aparecerán aquí al rellenar el protocolo.
                </p>
              </div>
            ) : (
              <ul className="space-y-3 p-3">
              {liveEntries.map((entry) => {
                const updatedAt = entry.updatedAt
                  ? new Date(entry.updatedAt).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "—";
                const stepLabel = STEP_LABELS[entry.currentStep ?? 0] ?? `Paso ${entry.currentStep}`;
                const isCritical = entry.hasRCP === true;

                return (
                  <li
                    key={entry.key}
                    className={`rounded-xl border p-4 ${
                      isCritical ? "animate-critical-blink" : ""
                    }`}
                    style={{
                      backgroundColor: CARD_BG,
                      borderColor: isCritical
                        ? "rgba(220, 38, 38, 0.6)"
                        : "rgba(234, 179, 8, 0.35)",
                      borderLeftWidth: "4px",
                      borderLeftColor: isCritical ? RED_CRITICAL : GOLD,
                    }}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span
                        className="rounded px-2 py-0.5 text-xs font-bold uppercase"
                        style={{ backgroundColor: GOLD_DIM, color: GOLD }}
                      >
                        Operador: {entry.operadorId || "—"}
                      </span>
                      <span
                        className="rounded px-2 py-0.5 text-xs font-bold uppercase"
                        style={{ backgroundColor: GOLD_DIM, color: GOLD }}
                      >
                        Móvil: {entry.unidadId || "—"}
                      </span>
                      {isCritical && (
                        <span
                          className="rounded px-2 py-0.5 text-xs font-bold uppercase"
                          style={{ backgroundColor: "rgba(220, 38, 38, 0.3)", color: "#fca5a5" }}
                        >
                          RCP
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-white">
                      {entry.nombre_paciente || entry.paciente_id || "Sin paciente"} — Paso:{" "}
                      {stepLabel}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Última actualización: {updatedAt}
                      {entry.hora_inicio_atencion && (
                        <> · Inicio: {new Date(entry.hora_inicio_atencion).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</>
                      )}
                    </p>
                    {entry.timestamp_eventos && entry.timestamp_eventos.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Eventos: {entry.timestamp_eventos.map((e) => e.evento).join(", ")}
                      </p>
                    )}
                    {/* Último mensaje y acuse de recibo */}
                    {liveMensajes[entry.key]?.text && (
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-slate-400">
                          Mensaje: {liveMensajes[entry.key].text}
                        </span>
                        {liveMensajes[entry.key].leido ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-900/50 px-2 py-0.5 font-medium text-emerald-400">
                            <span aria-hidden>✓</span> Leído
                          </span>
                        ) : null}
                      </p>
                    )}
                    {/* Mensajería táctica: botones rápidos + campo libre */}
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-600/50 pt-3">
                      {PRESETS.map((preset) => (
                        <button
                          key={preset.text}
                          type="button"
                          onClick={() => sendMensaje(entry.key, preset.text)}
                          className="min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                          style={{ backgroundColor: preset.color }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Mensaje a la unidad…"
                        value={mensajeDraft[entry.key] ?? ""}
                        onChange={(e) =>
                          setMensajeDraft((prev) => ({ ...prev, [entry.key]: e.target.value }))
                        }
                        className="min-h-[40px] flex-1 rounded-lg border-2 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        style={{ borderColor: "rgba(234, 88, 12, 0.4)", minWidth: "140px" }}
                        maxLength={200}
                        aria-label="Mensaje para la unidad"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const text = (mensajeDraft[entry.key] ?? "").trim();
                          if (text) {
                            sendMensaje(entry.key, text);
                            setMensajeDraft((prev) => ({ ...prev, [entry.key]: "" }));
                          }
                        }}
                        className="min-h-[40px] shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                        style={{ backgroundColor: ORANGE_WARNING }}
                      >
                        Enviar
                      </button>
                    </div>
                  </li>
                );
              })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Filtros y historial local */}
        <section className="mb-6 flex flex-wrap gap-4">
          <div className="min-w-[180px] flex-1">
            <label htmlFor="filter-unidad" className="mb-1 block text-xs font-medium text-slate-400">
              Filtrar por Unidad
            </label>
            <select
              id="filter-unidad"
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="">Todas las unidades</option>
              {unidades.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-1">
            <label htmlFor="filter-operador" className="mb-1 block text-xs font-medium text-slate-400">
              Filtrar por Paramédico
            </label>
            <select
              id="filter-operador"
              value={filterOperador}
              onChange={(e) => setFilterOperador(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="">Todos los operadores</option>
              {operadores.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
            Historial local (reportes guardados)
          </h2>
          {filtrados.length === 0 ? (
            <div
              className="rounded-xl border border-slate-600/50 p-8 text-center"
              style={{ backgroundColor: CARD_BG }}
            >
              <p className="text-slate-400">
                {list.length === 0
                  ? "No hay reportes en la memoria local."
                  : "Ningún reporte coincide con los filtros."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtrados.map((entry) => {
                const date = new Date(entry.createdAt);
                const fechaHora = date.toLocaleString("es-ES", {
                  dateStyle: "short",
                  timeStyle: "short",
                });
                const paciente = entry.nombrePaciente || entry.pacienteId || "Sin nombre";

                return (
                  <li
                    key={entry.id}
                    className="rounded-xl border p-4"
                    style={{
                      backgroundColor: CARD_BG,
                      borderColor: "rgba(234, 179, 8, 0.35)",
                    }}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span
                        className="rounded px-2 py-0.5 text-xs font-bold uppercase"
                        style={{ backgroundColor: GOLD_DIM, color: GOLD }}
                      >
                        Operador: {entry.operadorId || "—"}
                      </span>
                      <span
                        className="rounded px-2 py-0.5 text-xs font-bold uppercase"
                        style={{ backgroundColor: GOLD_DIM, color: GOLD }}
                      >
                        Móvil: {entry.unidadId || "—"}
                      </span>
                    </div>
                    <p className="font-semibold text-white">
                      {fechaHora} — {paciente}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      ID paciente: {entry.pacienteId || "—"}
                      {entry.data.sintomas_texto && (
                        <>
                          {" "}
                          · {String(entry.data.sintomas_texto).slice(0, 60)}
                          {String(entry.data.sintomas_texto).length > 60 ? "…" : ""}
                        </>
                      )}
                    </p>
                    {entry.data.glasgow_score != null && (
                      <p className="mt-1 text-xs text-slate-500">
                        Glasgow: {entry.data.glasgow_score}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
    </>
  );
}
