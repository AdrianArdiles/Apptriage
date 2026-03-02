"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiUrl } from "@/lib/api";
import type { NivelGravedad, RegistroTriage } from "@/lib/types";

const ETIQUETAS: Record<NivelGravedad, string> = {
  1: "No urgente",
  2: "Prioritario",
  3: "Urgencia",
  4: "Emergencia",
  5: "Resucitación (Inmediato)",
};

const NIVELES: NivelGravedad[] = [1, 2, 3, 4, 5];

type FiltroNivel = NivelGravedad | "todos";

const BG_DARK = "#0f172a";
const CARD_BG = "#1e293b";
const BORDER_SUBTLE = "rgba(51, 65, 85, 0.6)";
const GOLD = "#eab308";

/** Colores triage con glassmorphism (semi-transparente). 5 = Resucitación (más grave), 1 = No urgente. */
const NIVEL_STYLES: Record<
  NivelGravedad,
  { bg: string; border: string; text: string }
> = {
  1: {
    bg: "rgba(59, 130, 246, 0.15)",
    border: "rgba(59, 130, 246, 0.5)",
    text: "#93c5fd",
  },
  2: {
    bg: "rgba(34, 197, 94, 0.15)",
    border: "rgba(34, 197, 94, 0.5)",
    text: "#86efac",
  },
  3: {
    bg: "rgba(234, 179, 8, 0.15)",
    border: "rgba(234, 179, 8, 0.5)",
    text: "#fde047",
  },
  4: {
    bg: "rgba(234, 88, 12, 0.15)",
    border: "rgba(234, 88, 12, 0.5)",
    text: "#fdba74",
  },
  5: {
    bg: "rgba(220, 38, 38, 0.15)",
    border: "rgba(220, 38, 38, 0.5)",
    text: "#fca5a5",
  },
};

/** Icono tipo Lucide/HeroIcons: usuarios/lista */
function IconUsers(): React.ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Icono: actividad / ritmo cardíaco */
function IconActivity(): React.ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

/** Icono: escudo (gestión) */
function IconShield(): React.ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

/** Estilo de fila tabla por nivel (tema oscuro) */
function getRowStyle(nivel: NivelGravedad): React.CSSProperties {
  const s = NIVEL_STYLES[nivel];
  return {
    backgroundColor: s.bg,
    borderLeft: `4px solid ${s.border}`,
    color: "#e2e8f0",
  };
}

export default function DashboardPage(): React.ReactElement {
  const router = useRouter();
  const [pacientes, setPacientes] = React.useState<RegistroTriage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filtroNivel, setFiltroNivel] = React.useState<FiltroNivel>("todos");

  React.useEffect(() => {
    let cancelled = false;
    async function fetchPacientes(): Promise<void> {
      try {
        const res = await fetch(apiUrl("/api/dashboard/pacientes"));
        if (!res.ok) throw new Error("Error al cargar");
        const data = (await res.json()) as RegistroTriage[];
        if (!cancelled) setPacientes(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar pacientes");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPacientes();
    return () => {
      cancelled = true;
    };
  }, []);

  const pacientesFiltrados = React.useMemo(() => {
    if (filtroNivel === "todos") return pacientes;
    return pacientes.filter((p) => p.nivel_gravedad === filtroNivel);
  }, [pacientes, filtroNivel]);

  const conteoPorNivel = React.useMemo(() => {
    const counts: Record<NivelGravedad, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const p of pacientes) counts[p.nivel_gravedad] += 1;
    return counts;
  }, [pacientes]);

  const totalEnEspera = pacientes.length;

  const handleCerrarGestion = () => {
    router.push("/");
  };

  const filterOptions = (["todos", 1, 2, 3, 4, 5] as const).map((f) => ({
    value: f,
    label: f === "todos" ? "Todos" : `Nivel ${f}`,
  }));

  return (
    <div
      className="min-h-screen font-sans text-slate-100"
      style={{ backgroundColor: BG_DARK }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b px-4 py-3"
        style={{ backgroundColor: CARD_BG, borderColor: BORDER_SUBTLE }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-amber-400"
              style={{ backgroundColor: "rgba(234, 179, 8, 0.2)", border: "1px solid rgba(234, 179, 8, 0.4)" }}
            >
              <IconActivity />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Dashboard de Gestión</h1>
              <p className="text-xs text-slate-400">Pacientes en espera por nivel de gravedad</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/historial"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-700/80"
            >
              Historial
            </Link>
            <button
              type="button"
              onClick={handleCerrarGestion}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ borderColor: GOLD, color: GOLD }}
            >
              <IconShield />
              Cerrar Gestión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Título prominente */}
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Pacientes en espera
        </h2>

        {/* Tarjetas de nivel (glassmorphism) */}
        <section className="mb-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
            Contadores por nivel
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {NIVELES.map((n) => {
              const s = NIVEL_STYLES[n];
              const isActive = filtroNivel === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFiltroNivel(isActive ? "todos" : n)}
                  className="rounded-xl border-2 p-4 text-left backdrop-blur-sm transition focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
                  style={{
                    backgroundColor: s.bg,
                    borderColor: isActive ? s.border : "rgba(51, 65, 85, 0.5)",
                    boxShadow: isActive ? `0 4px 14px ${s.border}40` : "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  <span className="block text-xs font-medium uppercase tracking-wide" style={{ color: s.text }}>
                    Nivel {n}
                  </span>
                  <span className="mt-1 block text-2xl font-bold" style={{ color: s.text }}>
                    {conteoPorNivel[n]}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Total en espera: <strong className="text-white">{totalEnEspera}</strong>
          </p>
        </section>

        {/* Botones de filtro */}
        <section className="mb-6">
          <p className="mb-2 text-sm font-medium text-slate-400">Filtrar</p>
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((opt) => {
              const isActive = filtroNivel === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setFiltroNivel(opt.value)}
                  className="min-h-[44px] touch-manipulation rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98]"
                  style={{
                    backgroundColor: isActive ? CARD_BG : "transparent",
                    borderColor: isActive ? GOLD : "rgba(71, 85, 105, 0.6)",
                    color: isActive ? GOLD : "rgb(148, 163, 184)",
                    boxShadow: isActive ? "0 2px 12px rgba(234, 179, 8, 0.25)" : "none",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Tabla */}
        <section
          className="overflow-hidden rounded-xl border"
          style={{ backgroundColor: CARD_BG, borderColor: BORDER_SUBTLE }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <IconUsers />
              <span className="ml-2">Cargando…</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-red-400">{error}</div>
          ) : pacientesFiltrados.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              {filtroNivel === "todos"
                ? "No hay pacientes en espera. Registre triajes desde la app móvil."
                : `No hay pacientes con nivel ${filtroNivel}.`}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-600/50 hover:bg-transparent">
                  <TableHead className="w-[120px] text-slate-300">ID Paciente</TableHead>
                  <TableHead className="w-[160px] text-slate-300">Nivel</TableHead>
                  <TableHead className="text-slate-300">Síntomas</TableHead>
                  <TableHead className="max-w-[200px] text-slate-300">Recomendación</TableHead>
                  <TableHead className="w-[140px] text-slate-300">Fecha / Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacientesFiltrados.map((p, index) => (
                  <TableRow
                    key={`${p.paciente_id}-${p.fecha}-${index}`}
                    className="border-slate-600/50 hover:bg-transparent"
                    style={getRowStyle(p.nivel_gravedad)}
                  >
                    <TableCell className="font-mono font-medium text-slate-200">
                      {p.paciente_id}
                    </TableCell>
                    <TableCell>
                      <span style={{ color: NIVEL_STYLES[p.nivel_gravedad].text }}>
                        {p.nivel ?? ETIQUETAS[p.nivel_gravedad]} ({p.nivel_gravedad})
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-slate-300">
                      {p.sintomas_texto}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-slate-300">
                      {p.recomendacion}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-400">
                      {new Date(p.fecha).toLocaleString("es", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </main>
    </div>
  );
}
