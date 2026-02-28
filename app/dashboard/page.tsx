"use client";

import * as React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

/** Asigna color de fila según nivel de gravedad (Dashboard). */
function getRowClassesByNivel(nivel: NivelGravedad): string {
  switch (nivel) {
    case 1:
      return "animate-pulse-emergency bg-red-100 text-red-900 hover:bg-red-200/90";
    case 2:
      return "bg-orange-100 text-orange-900 hover:bg-orange-200/80";
    case 3:
      return "bg-amber-100 text-amber-900 hover:bg-amber-200/80";
    case 4:
      return "bg-emerald-100 text-emerald-900 hover:bg-emerald-200/80";
    case 5:
      return "bg-blue-100 text-blue-900 hover:bg-blue-200/80";
    default:
      return "";
  }
}

/** Clases para el texto del nivel (mismo color que la fila). */
function getNivelTextClasses(nivel: NivelGravedad): string {
  switch (nivel) {
    case 1:
      return "font-semibold text-red-800";
    case 2:
      return "font-medium text-orange-800";
    case 3:
      return "font-medium text-amber-800";
    case 4:
      return "font-medium text-emerald-800";
    case 5:
      return "font-medium text-blue-800";
    default:
      return "text-slate-700";
  }
}

export default function DashboardPage(): React.ReactElement {
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
        if (!cancelled) {
          setPacientes(data);
        }
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
    const counts: Record<NivelGravedad, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const p of pacientes) {
      counts[p.nivel_gravedad] += 1;
    }
    return counts;
  }, [pacientes]);

  const totalEnEspera = pacientes.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Dashboard — Personal médico</h1>
              <p className="text-xs text-slate-500">Pacientes en espera por nivel de gravedad</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/historial">
              <Button variant="outline" size="sm">
                Historial de Ingresos
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                Ir a triaje
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-slate-800">Pacientes en espera</CardTitle>
            <CardDescription>
              Ordenados por nivel de gravedad. Filtre por nivel o vea el contador por nivel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Contador: Pacientes en espera por nivel */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Pacientes en espera por nivel
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-600">
                  Total: <strong className="text-slate-800">{totalEnEspera}</strong>
                </span>
                {NIVELES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFiltroNivel(filtroNivel === n ? "todos" : n)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${getRowClassesByNivel(n)} ${filtroNivel === n ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
                  >
                    Nivel {n}: {conteoPorNivel[n]}
                  </button>
                ))}
                <Button
                  type="button"
                  variant={filtroNivel === "todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroNivel("todos")}
                >
                  Todos
                </Button>
              </div>
            </div>

            {/* Filtro por nivel */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">Filtrar:</span>
              <div className="flex flex-wrap gap-1">
                {(["todos", 1, 2, 3, 4, 5] as const).map((f) => (
                  <Button
                    key={f}
                    type="button"
                    variant={filtroNivel === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroNivel(f)}
                  >
                    {f === "todos" ? "Todos" : `Nivel ${f}`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tabla */}
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                Cargando…
              </div>
            ) : error ? (
              <div className="py-8 text-center text-sm text-red-600">{error}</div>
            ) : pacientesFiltrados.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                {filtroNivel === "todos"
                  ? "No hay pacientes en espera. Registre triajes desde la página principal."
                  : `No hay pacientes con nivel ${filtroNivel}.`}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px]">ID Paciente</TableHead>
                    <TableHead className="w-[160px]">Nivel</TableHead>
                    <TableHead>Síntomas</TableHead>
                    <TableHead className="max-w-[200px]">Recomendación</TableHead>
                    <TableHead className="w-[140px]">Fecha / Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pacientesFiltrados.map((p, index) => {
                    const esGravedadAlta = p.nivel_gravedad === 4 || p.nivel_gravedad === 5;
                    return (
                    <TableRow
                      key={`${p.paciente_id}-${p.fecha}-${index}`}
                      className={`${getRowClassesByNivel(p.nivel_gravedad)} ${esGravedadAlta ? "border-l-4 border-l-blue-500" : ""}`}
                    >
                      <TableCell className="font-mono font-medium">
                        {p.paciente_id}
                      </TableCell>
                      <TableCell>
                        <span className={getNivelTextClasses(p.nivel_gravedad)}>
                          {p.nivel ?? ETIQUETAS[p.nivel_gravedad]} ({p.nivel_gravedad})
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate">
                        {p.sintomas_texto}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {p.recomendacion}
                      </TableCell>
                      <TableCell className="whitespace-nowrap opacity-90">
                        {new Date(p.fecha).toLocaleString("es", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
