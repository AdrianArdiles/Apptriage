"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getHistorialTriageAll, type HistorialTriageEntry } from "@/lib/firebase-historial";
import type { NivelGravedad } from "@/lib/types";

const CARD_GLASS = "rgba(30, 41, 59, 0.6)";
const BORDER_SUBTLE = "rgba(51, 65, 85, 0.6)";
const GOLD = "#eab308";

type FiltroTiempo = "hoy" | "semana" | "mes";

const NIVEL_LABELS: Record<NivelGravedad, string> = {
  1: "Nivel 1",
  2: "Nivel 2",
  3: "Nivel 3",
  4: "Nivel 4",
  5: "Nivel 5",
};

const COLORS_NEON = ["#3b82f6", "#22c55e", "#eab308", "#ea580c", "#dc2626"];

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

  const porNivel = React.useMemo(() => {
    const counts: Record<NivelGravedad, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filtered.forEach((e) => {
      const n = e.registro.nivel_gravedad ?? 1;
      counts[n] = (counts[n] ?? 0) + 1;
    });
    return ([1, 2, 3, 4, 5] as NivelGravedad[]).map((n) => ({
      name: NIVEL_LABELS[n],
      nivel: n,
      cantidad: counts[n],
      fill: COLORS_NEON[n - 1],
    }));
  }, [filtered]);

  const pieData = React.useMemo(() => porNivel.filter((d) => d.cantidad > 0), [porNivel]);

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

      <section className="mb-8">
        <div
          className="rounded-xl border p-6 backdrop-blur-sm"
          style={{ backgroundColor: CARD_GLASS, borderColor: BORDER_SUBTLE }}
        >
          <h3 className="mb-4 text-base font-semibold text-white">Triage por nivel de gravedad</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porNivel} margin={{ top: 12, right: 12, bottom: 24, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.5)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(71, 85, 105, 0.6)" }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(71, 85, 105, 0.6)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: `1px solid ${BORDER_SUBTLE}`,
                    borderRadius: "12px",
                    color: "#e2e8f0",
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                  {porNivel.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={COLORS_NEON[entry.nivel - 1]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {pieData.length > 0 && (
        <section className="mb-8">
          <div
            className="rounded-xl border p-6 backdrop-blur-sm"
            style={{ backgroundColor: CARD_GLASS, borderColor: BORDER_SUBTLE }}
          >
            <h3 className="mb-4 text-base font-semibold text-white">Distribución por nivel</h3>
            <div className="mx-auto h-[280px] w-full max-w-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="cantidad"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: "#94a3b8" }}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_NEON[index % COLORS_NEON.length]} stroke={BORDER_SUBTLE} strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: `1px solid ${BORDER_SUBTLE}`,
                      borderRadius: "12px",
                      color: "#e2e8f0",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: "#94a3b8" }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

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
