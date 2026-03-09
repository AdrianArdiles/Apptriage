"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { getHistorialTriageAll, type HistorialTriageEntry } from "@/lib/firebase-historial";
import type { FiltroTiempo } from "./estadisticas-charts";

const CARD_GLASS = "rgba(30, 41, 59, 0.6)";
const BORDER_SUBTLE = "rgba(51, 65, 85, 0.6)";
const GOLD = "#eab308";

const EstadisticasCharts = dynamic(() => import("./estadisticas-charts").then((m) => ({ default: m.EstadisticasCharts })), {
  ssr: false,
  loading: () => (
    <div className="mb-8 rounded-xl border p-8 text-center" style={{ backgroundColor: CARD_GLASS, borderColor: BORDER_SUBTLE }}>
      <p className="text-slate-400">Cargando gráficos…</p>
    </div>
  ),
});

function getBoundsForFilter(filtro: FiltroTiempo): { desde: Date; hasta: Date } {
  const hasta = new Date();
  const desde = new Date();
  if (filtro === "hoy") {
    desde.setHours(0, 0, 0, 0);
  } else if (filtro === "semana") {
    desde.setDate(desde.getDate() - 7);
    desde.setHours(0, 0, 0, 0);
  } else {
    desde.setMonth(desde.getMonth() - 1);
    desde.setDate(1);
    desde.setHours(0, 0, 0, 0);
  }
  return { desde, hasta };
}

function filterByPeriod(entries: HistorialTriageEntry[], filtro: FiltroTiempo): HistorialTriageEntry[] {
  const { desde, hasta } = getBoundsForFilter(filtro);
  return entries.filter((e) => {
    const date = new Date(e.registro.fecha || e.createdAt);
    return date >= desde && date <= hasta;
  });
}

export default function ManagerEstadisticasPage(): React.ReactElement {
  const [filtro, setFiltro] = React.useState<FiltroTiempo>("mes");
  const [entries, setEntries] = React.useState<HistorialTriageEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getHistorialTriageAll()
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Error al cargar historial");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = React.useMemo(() => filterByPeriod(entries, filtro), [entries, filtro]);

  const rcpCount = React.useMemo(() => {
    return filtered.filter((e) => {
      const r = e.registro;
      const text = (r.sintomas_texto ?? "") + (r.diagnostico_presuntivo ?? "");
      return /RCP/i.test(text);
    }).length;
  }, [filtered]);

  const filtros: { value: FiltroTiempo; label: string }[] = [
    { value: "hoy", label: "Hoy" },
    { value: "semana", label: "Esta Semana" },
    { value: "mes", label: "Este Mes" },
  ];

  if (loading) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: CARD_GLASS, borderColor: BORDER_SUBTLE }}>
        <p className="text-slate-400">Cargando datos desde Firebase…</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-2 text-xl font-bold text-white">Estadísticas</h2>
      <p className="mb-6 text-sm text-slate-400">
        Datos desde la base histórica de Firebase. Solo visible en sesión de Manager.
      </p>

      <section className="mb-8">
        <p className="mb-2 text-sm font-medium text-slate-400">Período</p>
        <div className="flex flex-wrap gap-2">
          {filtros.map((f) => {
            const isActive = filtro === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFiltro(f.value)}
                className="min-h-[44px] touch-manipulation rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition"
                style={{
                  backgroundColor: isActive ? "rgba(30, 41, 59, 0.9)" : "transparent",
                  borderColor: isActive ? GOLD : "rgba(71, 85, 105, 0.6)",
                  color: isActive ? GOLD : "rgb(148, 163, 184)",
                  boxShadow: isActive ? "0 2px 12px rgba(234, 179, 8, 0.25)" : "none",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-xl border border-red-800/60 p-4" style={{ backgroundColor: "rgba(127, 29, 29, 0.3)" }}>
          <p className="text-red-300">{error}</p>
        </div>
      )}

      <section className="mb-8">
        <div
          className="rounded-xl border p-6 backdrop-blur-sm"
          style={{
            backgroundColor: "rgba(220, 38, 38, 0.12)",
            borderColor: "rgba(220, 38, 38, 0.45)",
          }}
        >
          <h3 className="mb-1 text-sm font-medium uppercase tracking-wide text-red-300">RCP en el período</h3>
          <p className="text-4xl font-bold text-red-400">{rcpCount}</p>
          <p className="mt-1 text-sm text-slate-400">
            {filtro === "hoy" ? "Hoy" : filtro === "semana" ? "Últimos 7 días" : "Este mes"}
          </p>
        </div>
      </section>

      <EstadisticasCharts filtro={filtro} filtered={filtered} />

      <section>
        <div
          className="rounded-xl border p-6 backdrop-blur-sm"
          style={{ backgroundColor: "rgba(234, 179, 8, 0.08)", borderColor: "rgba(234, 179, 8, 0.35)" }}
        >
          <h3 className="mb-1 text-sm font-medium uppercase tracking-wide text-amber-300">Total atenciones en el período</h3>
          <p className="text-3xl font-bold text-amber-400">{filtered.length}</p>
        </div>
      </section>
    </>
  );
}
