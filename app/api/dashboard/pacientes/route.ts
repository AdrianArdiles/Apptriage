import { NextResponse } from "next/server";
import { obtenerTodosTriajes } from "@/lib/mock-db";
import type { RegistroTriage } from "@/lib/types";
import { CORS_HEADERS } from "@/lib/cors";

/** Necesario para permitir build con output: 'export' (app Capacitor). En producción móvil usar backend desplegado. */
export const dynamic = "force-static";

/** Respuesta a preflight CORS (OPTIONS) desde Capacitor/localhost. */
export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

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
    return NextResponse.json(ordenados, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener la lista de pacientes" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
