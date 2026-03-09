"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoEkg } from "@/components/logo-ekg";
import { useAuth } from "@/lib/auth-context";
import { getOperadorId, getUnidadId } from "@/lib/operador-storage";
import {
  getHistorialPdfList,
  removeFromHistorialPdf,
  type HistorialPdfEntry,
} from "@/lib/historial-pdf-storage";
import { getAtencionesFromApi, deleteAtencionApi } from "@/lib/api";
import { Capacitor } from "@capacitor/core";
import { getPDFBlob } from "@/lib/pdf-export";
import { getLogoDataUrl } from "@/lib/logo-image";
import { generateAndSharePDF, generatePDFAndGetUri } from "@/lib/share-pdf";
import { FileOpener } from "@capacitor-community/file-opener";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BG_DARK = "#0f172a";
const CARD_BG = "#1e293b";
const BLUE_MEDICAL = "#2563eb";
const RED_EMERGENCY = "#dc2626";

function reportContainsRCP(entry: HistorialPdfEntry): boolean {
  const events = entry.data.timestamp_eventos ?? [];
  const hasRcpEvent = events.some((e) => String(e.evento).toUpperCase().includes("RCP"));
  const text = (entry.data.sintomas_texto ?? "").toUpperCase();
  return hasRcpEvent || text.includes("RCP");
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function SearchIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/** Nombre de archivo tipo Reporte_[HORA]_[NOMBRE].pdf */
function formatFileName(hora: string, paciente: string): string {
  const safeName = paciente.replace(/\s+/g, "_").replace(/[^\w\u00C0-\u024F\-_.]/gi, "") || "Paciente";
  return `Reporte_${hora.replace(":", "-")}_${safeName}.pdf`;
}

/** Entrada del historial: base local + atencionId para borrar en Neon. */
type HistorialEntry = HistorialPdfEntry & { atencionId?: string };

export default function HistorialPage(): React.ReactElement {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = React.useState<HistorialEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busqueda, setBusqueda] = React.useState("");
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/");
  }, [user, authLoading, router]);

  const refreshList = React.useCallback(async () => {
    const localList = getHistorialPdfList();
    try {
      const apiList = await getAtencionesFromApi();
      const byId = new Map<string, HistorialEntry>();
      apiList.forEach((e) => {
        byId.set(e.id, {
          id: e.id,
          createdAt: e.createdAt,
          nombrePaciente: e.nombrePaciente,
          pacienteId: e.pacienteId,
          operadorId: e.operadorId,
          unidadId: e.unidadId,
          data: e.data,
          atencionId: e.atencionId,
        });
      });
      localList.forEach((e) => {
        const existing = byId.get(e.id);
        if (existing) {
          byId.set(e.id, { ...existing, fileUri: e.fileUri ?? existing.fileUri });
        } else {
          byId.set(e.id, { ...e });
        }
      });
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setList(merged);
    } catch {
      setList(localList.map((e) => ({ ...e })));
    }
  }, []);

  const filtrados = React.useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return list;
    return list.filter((entry) => {
      const nombre = (entry.nombrePaciente || entry.pacienteId || "").toLowerCase();
      return nombre.includes(q);
    });
  }, [list, busqueda]);

  React.useEffect(() => {
    refreshList().finally(() => setLoading(false));
  }, [refreshList]);

  const handleAbrir = React.useCallback(async (entry: HistorialPdfEntry) => {
    setActionLoadingId(entry.id);
    try {
      if (Capacitor.isNativePlatform()) {
        let uriToOpen: string | null = entry.fileUri ?? null;
        if (uriToOpen) {
          try {
            await FileOpener.open({
              filePath: uriToOpen,
              contentType: "application/pdf",
            });
            return;
          } catch {
            uriToOpen = null;
          }
        }
        if (!uriToOpen) {
          uriToOpen = await generatePDFAndGetUri(entry.data, entry.id);
          if (uriToOpen) {
            await FileOpener.open({
              filePath: uriToOpen,
              contentType: "application/pdf",
            });
          } else {
            alert("No se pudo generar el archivo para visualizar.");
          }
        }
      } else {
        const logoDataUrl = await getLogoDataUrl();
        const blob = getPDFBlob(entry.data, logoDataUrl ? { logoDataUrl } : undefined);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (e) {
      console.error("Error al abrir PDF:", e);
      alert("Archivo no encontrado en el dispositivo.");
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  const handleCompartir = React.useCallback(async (entry: HistorialPdfEntry) => {
    setActionLoadingId(entry.id);
    try {
      await generateAndSharePDF(entry.data);
    } catch (e) {
      console.error("Error al compartir PDF:", e);
      alert("No se pudo compartir el PDF.");
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  const handleEliminar = React.useCallback(
    async (id: string, atencionId?: string) => {
      removeFromHistorialPdf(id);
      if (atencionId) await deleteAtencionApi(atencionId);
      setDeleteConfirmId(null);
      await refreshList();
    },
    [refreshList]
  );

  if (!authLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center font-sans text-slate-400" style={{ backgroundColor: BG_DARK }}>
        Redirigiendo…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen font-sans text-slate-100"
      style={{ backgroundColor: BG_DARK }}
    >
      {/* Header táctico: logo EKG + Paramédico / Móvil */}
      <header
        className="sticky top-0 z-40 border-b px-4 py-3 shadow-sm"
        style={{ backgroundColor: CARD_BG, borderColor: "rgba(37, 99, 235, 0.3)" }}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition hover:opacity-90"
              style={{ backgroundColor: BLUE_MEDICAL }}
              aria-label="Volver al inicio"
            >
              <span className="text-xl leading-none">←</span>
            </Link>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: BG_DARK }}
            >
              <LogoEkg className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-200">
                {getOperadorId() || "—"}{" "}
                {getUnidadId() && <span className="text-slate-400">· {getUnidadId()}</span>}
              </p>
              <p className="text-xs text-slate-500">Últimos PDF</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        {/* Buscador: lupa azul + input */}
        {!loading && list.length > 0 && (
          <div className="mb-6">
            <label htmlFor="historial-busqueda" className="sr-only">
              Buscar por nombre del paciente
            </label>
            <div
              className="flex items-center gap-3 rounded-xl border-2 border-blue-500/40 px-4 py-3 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/50"
              style={{ backgroundColor: CARD_BG }}
            >
              <SearchIcon className="shrink-0" style={{ color: BLUE_MEDICAL }} />
              <input
                id="historial-busqueda"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre del paciente..."
                className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">Cargando atenciones…</div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="mb-5 flex h-24 w-24 items-center justify-center rounded-2xl"
              style={{ backgroundColor: CARD_BG }}
              aria-hidden
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-500"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </div>
            <p className="text-xl font-medium text-slate-300">
              No se registran intervenciones en la memoria local
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Los informes que generes desde la ficha clínica aparecerán aquí.
            </p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-slate-300">
              No se encontraron reportes con ese nombre
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Prueba con otro término o borra el filtro.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {filtrados.map((entry) => {
              const date = new Date(entry.createdAt);
              const hora = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
              const paciente = entry.nombrePaciente || entry.pacienteId || "Sin nombre";
              const fileName = formatFileName(hora, paciente);
              const isRcp = reportContainsRCP(entry);
              const isBusy = actionLoadingId === entry.id;

              return (
                <li
                  key={entry.id}
                  className="overflow-hidden rounded-xl shadow-sm"
                  style={{
                    backgroundColor: CARD_BG,
                    borderLeftWidth: "4px",
                    borderLeftColor: isRcp ? RED_EMERGENCY : BLUE_MEDICAL,
                  }}
                >
                  <div className="flex min-w-0 flex-1 flex-col p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-white">
                        {hora} — {paciente}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Unidad: {entry.unidadId || "—"} | Operador: {entry.operadorId || "—"}
                      </p>
                      <p
                        className="mt-2 truncate rounded-lg px-2 py-1 font-mono text-xs text-slate-300"
                        style={{ backgroundColor: "rgba(15, 23, 42, 0.6)" }}
                        title={fileName}
                      >
                        {fileName}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-2 sm:mt-0 sm:gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAbrir(entry);
                        }}
                        disabled={isBusy}
                        className="flex min-h-[48px] min-w-[48px] touch-manipulation flex-col items-center justify-center rounded-xl transition hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: BLUE_MEDICAL }}
                        aria-label="Ver PDF"
                      >
                        <EyeIcon className="text-white" />
                        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                          Ver
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCompartir(entry)}
                        disabled={isBusy}
                        className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center rounded-xl bg-emerald-600 transition hover:bg-emerald-500 disabled:opacity-50"
                        aria-label="Compartir PDF"
                      >
                        <ShareIcon className="text-white" />
                        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                          Compartir
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(entry.id)}
                        disabled={isBusy}
                        className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center rounded-xl bg-red-600/90 transition hover:bg-red-600 disabled:opacity-50"
                        aria-label="Eliminar del historial"
                      >
                        <TrashIcon className="text-white" />
                        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                          Eliminar
                        </span>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* Botón VOLVER con degradado Rojo-Azul al final */}
      <footer
        className="mt-12 border-t px-4 py-8 text-center"
        style={{ borderColor: "rgba(51, 65, 85, 0.6)" }}
      >
        <Link
          href="/"
          className="inline-flex min-h-[56px] min-w-[280px] items-center justify-center rounded-xl px-8 py-4 text-base font-bold text-white transition active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${RED_EMERGENCY} 0%, ${BLUE_MEDICAL} 100%)`,
            boxShadow: "0 0 20px rgba(37, 99, 235, 0.4), 0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          ← VOLVER AL INICIO
        </Link>
      </footer>

      {/* Modal confirmación eliminar */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent
          className="border-slate-700 text-slate-100"
          style={{ backgroundColor: CARD_BG }}
        >
          <DialogHeader>
            <DialogTitle className="text-slate-100">¿Eliminar este informe?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Se quitará del historial local. El archivo no se borra del dispositivo si ya lo compartiste.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: BLUE_MEDICAL }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (!deleteConfirmId) return;
                const entry = list.find((e) => e.id === deleteConfirmId);
                void handleEliminar(deleteConfirmId, entry?.atencionId);
              }}
              className="min-h-[44px] rounded-xl border-2 px-4 py-2.5 text-sm font-semibold text-red-300"
              style={{ borderColor: RED_EMERGENCY }}
            >
              Sí, eliminar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
