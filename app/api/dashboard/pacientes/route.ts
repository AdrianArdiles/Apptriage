import { NextResponse } from "next/server";
import { obtenerTodosTriajes } from "@/lib/mock-db";
import type { RegistroTriage } from "@/lib/types";

/** Necesario para permitir build con output: 'export' (app Capacitor). En producción móvil usar backend desplegado. */
export const dynamic = "force-static";

/**
 * GET /api/dashboard/pacientes
 * Lista de pacientes en espera (triajes) ordenados por nivel de gravedad descendente (más grave primero).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const todos = obtenerTodosTriajes();
    const ordenados: RegistroTriage[] = [...todos].sort(
      (a, b) => b.nivel_gravedad - a.nivel_gravedad
    );
    return NextResponse.json(ordenados);
  } catch {
    return NextResponse.json(
      { error: "Error al obtener la lista de pacientes" },
      { status: 500 }
    );
  }
}
