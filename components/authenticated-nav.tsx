"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/firebase-auth";
import { clearManagerSession } from "@/lib/manager-session";

const BG_NAV = "#1e293b";
const BORDER_SUBTLE = "rgba(51, 65, 85, 0.6)";
const GOLD = "#eab308";
const BLUE_MEDICAL = "#2563eb";

export function AuthenticatedNav(): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = React.useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      clearManagerSession();
      await signOut();
      router.replace("/login");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof alert === "function") alert(`Error al cerrar sesión: ${msg}`);
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut, router]);

  const isAtencion = pathname === "/atencion" || pathname.startsWith("/atencion/");
  const isManager = pathname === "/manager" || pathname.startsWith("/manager/");

  return (
    <header
      className="sticky top-0 z-50 border-b px-4 py-2"
      style={{ backgroundColor: BG_NAV, borderColor: BORDER_SUBTLE }}
      role="banner"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <nav className="flex flex-wrap items-center gap-2" aria-label="Navegación principal">
          <Link
            href="/atencion"
            className="min-h-[40px] touch-manipulation rounded-xl border-2 px-4 py-2 text-sm font-semibold transition"
            style={{
              backgroundColor: isAtencion ? "rgba(37, 99, 235, 0.2)" : "transparent",
              borderColor: isAtencion ? BLUE_MEDICAL : "rgba(71, 85, 105, 0.6)",
              color: isAtencion ? "#93c5fd" : "rgb(148, 163, 184)",
            }}
          >
            Nueva Atención
          </Link>
          <Link
            href="/manager"
            className="min-h-[40px] touch-manipulation rounded-xl border-2 px-4 py-2 text-sm font-semibold transition"
            style={{
              backgroundColor: isManager ? "rgba(234, 179, 8, 0.15)" : "transparent",
              borderColor: isManager ? GOLD : "rgba(71, 85, 105, 0.6)",
              color: isManager ? GOLD : "rgb(148, 163, 184)",
            }}
          >
            Panel de Gestión
          </Link>
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="min-h-[40px] rounded-xl border-2 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:text-slate-200 disabled:opacity-60"
          style={{ borderColor: BORDER_SUBTLE }}
        >
          {loggingOut ? "Cerrando…" : "Cerrar sesión"}
        </button>
      </div>
    </header>
  );
}
