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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NivelGravedad, RegistroTriage } from "@/lib/types";

const ETIQUETAS_NIVEL: Record<NivelGravedad, string> = {
  1: "No urgente",
  2: "Prioritario",
  3: "Urgencia",
  4: "Emergencia",
  5: "Resucitación (Inmediato)",
};

/** Color del círculo y texto por nivel (rojo = más grave, verde = menos). */
const COLOR_CIRCULO: Record<NivelGravedad, { bg: string; text: string }> = {
  5: { bg: "bg-red-500", text: "text-red-800" },
  4: { bg: "bg-orange-500", text: "text-orange-800" },
  3: { bg: "bg-amber-500", text: "text-amber-800" },
  2: { bg: "bg-teal-500", text: "text-teal-800" },
  1: { bg: "bg-emerald-500", text: "text-emerald-800" },
};

const PAGE_SIZE = 10;

function truncar(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max).trim() + "…";
}

export default function HistorialPage(): React.ReactElement {
  const [registros, setRegistros] = React.useState<RegistroTriage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busqueda, setBusqueda] = React.useState("");
  const [filtroGravedad, setFiltroGravedad] = React.useState<NivelGravedad | "todos" | "urgentes">("todos");
  const [pagina, setPagina] = React.useState(0);
  const [detalle, setDetalle] = React.useState<RegistroTriage | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function fetchData(): Promise<void> {
      try {
        const res = await fetch("/api/dashboard/pacientes");
        if (!res.ok) throw new Error("Error al cargar historial");
        const data = (await res.json()) as RegistroTriage[];
        if (!cancelled) {
          setRegistros(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtrados = React.useMemo(() => {
    let list = [...registros].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    const q = busqueda.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const nombre = (r.nombre_paciente ?? r.paciente_id).toLowerCase();
        const dni = (r.dni ?? "").toLowerCase();
        return nombre.includes(q) || dni.includes(q);
      });
    }
    if (filtroGravedad === "urgentes") {
      list = list.filter((r) => r.nivel_gravedad === 4 || r.nivel_gravedad === 5);
    } else if (filtroGravedad !== "todos") {
      list = list.filter((r) => r.nivel_gravedad === filtroGravedad);
    }
    return list;
  }, [registros, busqueda, filtroGravedad]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginados = filtrados.slice(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE);

  React.useEffect(() => {
    if (pagina >= totalPaginas && totalPaginas > 0) setPagina(0);
  }, [pagina, totalPaginas]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Historial de Ingresos</h1>
              <p className="text-xs text-slate-500">Registro central de triajes</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                Triaje
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-white">
            <CardTitle className="text-slate-800">Registro de pacientes triados</CardTitle>
            <CardDescription>
              Búsqueda por nombre o DNI. Filtro por nivel de gravedad. Clic en una fila para ver el detalle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {/* Búsqueda y filtros */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Input
                  type="search"
                  placeholder="Buscar por nombre o DNI..."
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPagina(0);
                  }}
                  className="max-w-sm border-slate-200 bg-white"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600">Gravedad:</span>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant={filtroGravedad === "todos" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFiltroGravedad("todos");
                      setPagina(0);
                    }}
                  >
                    Todos
                  </Button>
                  {([5, 4, 3, 2, 1] as NivelGravedad[]).map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant={filtroGravedad === n ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setFiltroGravedad(n);
                        setPagina(0);
                      }}
                    >
                      Nivel {n}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={filtroGravedad === "urgentes" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFiltroGravedad(
                        filtroGravedad === "urgentes" ? "todos" : "urgentes"
                      );
                      setPagina(0);
                    }}
                  >
                    Urgentes (4-5)
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabla */}
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                Cargando…
              </div>
            ) : error ? (
              <div className="py-8 text-center text-sm text-red-600">{error}</div>
            ) : paginados.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No hay registros. Realice triajes desde la página principal.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-200">
                      <TableHead className="text-slate-600">Fecha y Hora</TableHead>
                      <TableHead className="text-slate-600">Nombre / ID</TableHead>
                      <TableHead className="text-slate-600">Nivel</TableHead>
                      <TableHead className="text-slate-600">Diagnóstico presuntivo</TableHead>
                      <TableHead className="text-slate-600">Glasgow</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginados.map((r, idx) => {
                      const color = COLOR_CIRCULO[r.nivel_gravedad];
                      return (
                        <TableRow
                          key={`${r.paciente_id}-${r.fecha}-${idx}`}
                          className="cursor-pointer border-slate-100 hover:bg-sky-50/60 transition-colors"
                          onClick={() => setDetalle(r)}
                        >
                          <TableCell className="whitespace-nowrap text-slate-700">
                            {new Date(r.fecha).toLocaleString("es", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-slate-800">
                              {r.nombre_paciente ?? r.paciente_id}
                            </span>
                            {r.dni ? (
                              <span className="ml-1 text-xs text-slate-500">DNI: {r.dni}</span>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-3 w-3 shrink-0 rounded-full ${color.bg}`}
                                aria-hidden
                              />
                              <span className={`text-sm font-medium ${color.text}`}>
                                {r.nivel ?? ETIQUETAS_NIVEL[r.nivel_gravedad]} ({r.nivel_gravedad})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[220px] text-slate-700">
                            {r.diagnostico_presuntivo
                              ? truncar(r.diagnostico_presuntivo, 50)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {r.glasgow != null ? (
                              <span className="font-mono font-medium">
                                {r.glasgow.puntaje_glasgow}
                                <span className="text-slate-400"> (E{r.glasgow.E} V{r.glasgow.V} M{r.glasgow.M})</span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Paginación */}
                {totalPaginas > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-600">
                      Mostrando {pagina * PAGE_SIZE + 1}–{Math.min((pagina + 1) * PAGE_SIZE, filtrados.length)} de {filtrados.length}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pagina === 0}
                        onClick={() => setPagina((p) => Math.max(0, p - 1))}
                      >
                        Anterior
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pagina >= totalPaginas - 1}
                        onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal detalle */}
      <Dialog open={!!detalle} onOpenChange={(open) => !open && setDetalle(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Detalle del triaje</DialogTitle>
          </DialogHeader>
          {detalle ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Paciente / ID</p>
                <p className="mt-1 font-medium text-slate-800">
                  {detalle.nombre_paciente ?? detalle.paciente_id}
                  {detalle.dni ? ` — DNI: ${detalle.dni}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fecha y hora</p>
                <p className="mt-1 text-slate-800">
                  {new Date(detalle.fecha).toLocaleString("es", { dateStyle: "full", timeStyle: "short" })}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nivel de gravedad</p>
                <p className="mt-1 font-medium text-slate-800">
                  {detalle.nivel ?? ETIQUETAS_NIVEL[detalle.nivel_gravedad]} (nivel {detalle.nivel_gravedad})
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Síntomas seleccionados</p>
                <p className="mt-1 text-slate-800 whitespace-pre-wrap">{detalle.sintomas_texto}</p>
              </div>
              {detalle.glasgow != null && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Escala de Glasgow</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                    <dt className="text-slate-500">Ocular (E)</dt>
                    <dd className="font-medium text-slate-800">{detalle.glasgow.E}</dd>
                    <dt className="text-slate-500">Verbal (V)</dt>
                    <dd className="font-medium text-slate-800">{detalle.glasgow.V}</dd>
                    <dt className="text-slate-500">Motor (M)</dt>
                    <dd className="font-medium text-slate-800">{detalle.glasgow.M}</dd>
                    <dt className="text-slate-500">Puntaje total</dt>
                    <dd className="font-mono font-semibold text-slate-800">{detalle.glasgow.puntaje_glasgow}</dd>
                  </dl>
                </div>
              )}
              {detalle.diagnostico_presuntivo && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Diagnóstico presuntivo</p>
                  <p className="mt-1 text-slate-800">{detalle.diagnostico_presuntivo}</p>
                </div>
              )}
              {detalle.justificacion && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Justificación</p>
                  <p className="mt-1 text-slate-800">{detalle.justificacion}</p>
                </div>
              )}
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Recomendación completa</p>
                <p className="mt-2 text-slate-800">{detalle.recomendacion}</p>
                {Array.isArray(detalle.pasos_a_seguir) && detalle.pasos_a_seguir.length > 0 && (
                  <ol className="mt-3 list-inside list-decimal space-y-1 text-slate-800">
                    {detalle.pasos_a_seguir.map((paso, i) => (
                      <li key={i}>{paso}</li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}