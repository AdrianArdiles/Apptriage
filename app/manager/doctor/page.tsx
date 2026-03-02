"use client";

import * as React from "react";
import {
  subscribeSolicitudesMedicacion,
  resolverSolicitud,
  type SolicitudMedicacion,
} from "@/lib/firebase-solicitudes-medicacion";
import { playNotificationSound } from "@/lib/notification-sound";

const CARD_BG = "#1e293b";
const BORDER_SUBTLE = "rgba(51, 65, 85, 0.6)";
const AMBER_ALERT = "rgba(234, 179, 8, 0.4)";
const RED_ALERT = "rgba(220, 38, 38, 0.5)";
const GREEN = "#16a34a";
const RED = "#dc2626";

export default function ManagerDoctorPage(): React.ReactElement {
  const [solicitudes, setSolicitudes] = React.useState<SolicitudMedicacion[]>([]);
  const prevPendientesRef = React.useRef<number>(0);

  React.useEffect(() => {
    const unsub = subscribeSolicitudesMedicacion(setSolicitudes);
    return unsub;
  }, []);

  const pendientes = React.useMemo(
    () => solicitudes.filter((s) => s.estado === "pendiente"),
    [solicitudes]
  );

  React.useEffect(() => {
    if (pendientes.length > prevPendientesRef.current && prevPendientesRef.current >= 0) {
      playNotificationSound();
    }
    prevPendientesRef.current = pendientes.length;
  }, [pendientes.length]);

  const handleAprobar = (id: string) => {
    if (!id) return;
    resolverSolicitud(id, "aprobado", "Doctor Web");
  };

  const handleRechazar = (id: string) => {
    if (!id) return;
    resolverSolicitud(id, "rechazado", "Doctor Web");
  };

  return (
    <>
      <h2 className="mb-2 text-xl font-bold text-white lg:text-2xl">Autorización Médica</h2>
      <p className="mb-6 text-sm text-slate-400">
        Solicitudes de medicación desde unidades. Alertas sonoras y visuales hasta aprobar o rechazar.
      </p>

      {pendientes.length > 0 && (
        <div
          className="mb-6 flex items-center gap-3 rounded-xl border-2 px-4 py-3"
          style={{ borderColor: RED_ALERT, backgroundColor: "rgba(220, 38, 38, 0.1)" }}
          role="alert"
        >
          <span className="flex h-3 w-3 animate-ping rounded-full bg-red-500" aria-hidden />
          <span className="font-semibold text-red-200">
            {pendientes.length} solicitud{pendientes.length !== 1 ? "es" : ""} pendiente{pendientes.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <section className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Solicitudes pendientes
        </h3>
        {pendientes.length === 0 ? (
          <div
            className="rounded-xl border p-8 text-center"
            style={{ backgroundColor: CARD_BG, borderColor: BORDER_SUBTLE }}
          >
            <p className="text-slate-400">No hay solicitudes de medicación pendientes.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {pendientes.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border-2 p-5"
                style={{
                  backgroundColor: CARD_BG,
                  borderColor: AMBER_ALERT,
                  boxShadow: "0 0 20px rgba(234, 179, 8, 0.2)",
                }}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded px-2 py-1 text-xs font-bold uppercase"
                    style={{ backgroundColor: "rgba(234, 179, 8, 0.2)", color: "#fde047" }}
                  >
                    {s.movilId}
                  </span>
                  {s.operadorId && (
                    <span className="text-sm text-slate-400">Operador: {s.operadorId}</span>
                  )}
                  <span className="text-xs text-slate-500">
                    {s.createdAt ? new Date(s.createdAt).toLocaleString("es-ES") : "—"}
                  </span>
                </div>
                <p className="mb-1 font-semibold text-white">
                  Medicación solicitada: <span className="text-amber-300">{s.medicacion}</span>
                </p>
                {(s.pacienteId || s.nombrePaciente) && (
                  <p className="mb-2 text-sm text-slate-400">
                    Paciente: {s.nombrePaciente || s.pacienteId || "—"}
                  </p>
                )}
                {s.justificacion && (
                  <p className="mb-4 text-sm text-slate-300">{s.justificacion}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => s.id && handleAprobar(s.id)}
                    className="min-h-[44px] rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: GREEN }}
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => s.id && handleRechazar(s.id)}
                    className="min-h-[44px] rounded-xl border-2 px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
                    style={{ borderColor: RED, color: RED }}
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {solicitudes.filter((s) => s.estado !== "pendiente").length > 0 && (
        <section className="mt-10 space-y-4">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Resueltas recientemente
          </h3>
          <ul className="space-y-2">
            {solicitudes
              .filter((s) => s.estado !== "pendiente")
              .slice(0, 10)
              .map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border p-4"
                  style={{ backgroundColor: CARD_BG, borderColor: BORDER_SUBTLE }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white">{s.medicacion}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        s.estado === "aprobado"
                          ? "bg-emerald-900/50 text-emerald-400"
                          : "bg-red-900/50 text-red-400"
                      }`}
                    >
                      {s.estado === "aprobado" ? "Aprobado" : "Rechazado"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {s.resueltoAt ? new Date(s.resueltoAt).toLocaleString("es-ES") : ""}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      )}
    </>
  );
}
