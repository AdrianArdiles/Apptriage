"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { hasManagerSession, clearManagerSession } from "@/lib/manager-session";
import { signOut } from "@/lib/firebase-auth";
import { AuthenticatedNav } from "@/components/authenticated-nav";

const BG_DARK = "#0f172a";
const CARD_BG = "#1e293b";
const GOLD = "#eab308";
const BORDER_SUBTLE = "rgba(51, 65, 85, 0.6)";

const TABS = [
  { href: "/manager", label: "Monitor en Vivo" },
  { href: "/manager/doctor", label: "Doctor" },
  { href: "/manager/estadisticas", label: "Estadísticas" },
  { href: "/manager/personal", label: "Personal" },
  { href: "/manager/exportar", label: "Exportar" },
] as const;

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const hasSession = mounted && hasManagerSession();

  React.useEffect(() => {
    if (!mounted) return;
    if (!hasManagerSession()) {
      router.replace("/atencion");
    }
  }, [mounted, router]);

  const handleCerrarGestion = () => {
    clearManagerSession();
    router.push("/atencion");
  };

  const handleCerrarSesion = async () => {
    try {
      clearManagerSession();
      await signOut();
      router.replace("/login");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof alert === "function") alert(`Error al cerrar sesión: ${msg}`);
    }
  };

  if (!mounted || !hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
        <p className="text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans text-slate-100" style={{ backgroundColor: BG_DARK }}>
      <AuthenticatedNav />
      <header
        className="sticky top-[52px] z-40 border-b px-4 py-3"
        style={{ backgroundColor: CARD_BG, borderColor: BORDER_SUBTLE }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-bold" style={{ color: GOLD }}>
            Panel de Gestión Profesional
          </h1>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Secciones del panel">
            {TABS.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="min-h-[40px] touch-manipulation rounded-xl border-2 px-4 py-2 text-sm font-semibold transition"
                  style={{
                    backgroundColor: isActive ? "rgba(234, 179, 8, 0.15)" : "transparent",
                    borderColor: isActive ? GOLD : "rgba(71, 85, 105, 0.6)",
                    color: isActive ? GOLD : "rgb(148, 163, 184)",
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleCerrarGestion}
              className="min-h-[40px] rounded-xl border-2 px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ borderColor: GOLD, color: GOLD }}
            >
              Cerrar Gestión
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1920px] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
        {children}
      </main>
    </div>
  );
}
