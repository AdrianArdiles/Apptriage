"use client";

import * as React from "react";
import { getHistorialPdfList } from "@/lib/historial-pdf-storage";

const CARD_GLASS = "rgba(30, 41, 59, 0.6)";
const BORDER_SUBTLE = "rgba(51, 65, 85, 0.6)";
const GOLD = "#eab308";

export default function ManagerPersonalPage(): React.ReactElement {
  const [list, setList] = React.useState(() => getHistorialPdfList());

  React.useEffect(() => {
    setList(getHistorialPdfList());
  }, []);

  const operadores = React.useMemo(() => {
    const set = new Set<string>();
    list.forEach((e) => {
      const o = (e.operadorId ?? "").trim();
      if (o) set.add(o);
    });
    return Array.from(set).sort();
  }, [list]);

  const unidades = React.useMemo(() => {
    const set = new Set<string>();
    list.forEach((e) => {
      const u = (e.unidadId ?? "").trim();
      if (u) set.add(u);
    });
    return Array.from(set).sort();
  }, [list]);

  return (
    <>
      <h2 className="mb-2 text-xl font-bold text-white">Personal</h2>
      <p className="mb-6 text-sm text-slate-400">
        Operadores y unidades que han generado reportes (desde historial local del dispositivo).
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div
          className="rounded-xl border p-6 backdrop-blur-sm"
          style={{ backgroundColor: CARD_GLASS, borderColor: BORDER_SUBTLE }}
        >
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
            Paramédicos (operadores)
          </h3>
          {operadores.length === 0 ? (
            <p className="text-slate-500">No hay datos en este dispositivo.</p>
          ) : (
            <ul className="space-y-2">
              {operadores.map((id) => (
                <li key={id} className="flex items-center gap-2 text-slate-200">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GOLD }} />
                  {id}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div
          className="rounded-xl border p-6 backdrop-blur-sm"
          style={{ backgroundColor: CARD_GLASS, borderColor: BORDER_SUBTLE }}
        >
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
            Unidades / Móviles
          </h3>
          {unidades.length === 0 ? (
            <p className="text-slate-500">No hay datos en este dispositivo.</p>
          ) : (
            <ul className="space-y-2">
              {unidades.map((id) => (
                <li key={id} className="flex items-center gap-2 text-slate-200">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GOLD }} />
                  {id}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
