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
import type { NivelGravedad } from "@/lib/types";
import type { HistorialTriageEntry } from "@/lib/firebase-historial";

const CARD_GLASS = "rgba(30, 41, 59, 0.6)";
const BORDER_SUBTLE = "rgba(51, 65, 85, 0.6)";
const COLORS_NEON = ["#3b82f6", "#22c55e", "#eab308", "#ea580c", "#dc2626"];

const NIVEL_LABELS: Record<NivelGravedad, string> = {
  1: "Nivel 1",
  2: "Nivel 2",
  3: "Nivel 3",
  4: "Nivel 4",
  5: "Nivel 5",
};

export type FiltroTiempo = "hoy" | "semana" | "mes";

export interface EstadisticasChartsProps {
  filtro: FiltroTiempo;
  filtered: HistorialTriageEntry[];
}

export function EstadisticasCharts({ filtro, filtered }: EstadisticasChartsProps): React.ReactElement {
  void filtro; // reservado para etiquetado por período en futuras mejoras
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

  return (
    <>
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
    </>
  );
}
