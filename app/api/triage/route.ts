import { NextResponse } from "next/server";
import type { EntradaTriage, RegistroTriage } from "@/lib/types";
import { MIN_SINTOMAS_CARACTERES } from "@/lib/types";
import { guardarTriage } from "@/lib/mock-db";
import { generarRecomendacion } from "@/lib/triage-logic";
import { categorizarConLLM, nivelNombreAGravedad } from "@/lib/triage-llm";
import { gravedadToColorAlerta } from "@/lib/color-alerta";
import { prisma } from "@/lib/prisma";
import { CORS_HEADERS } from "@/lib/cors";

/** Necesario para permitir build con output: 'export' (app Capacitor). En producción móvil usar backend desplegado. */
export const dynamic = "force-static";

/** Respuesta a preflight CORS (OPTIONS) desde Capacitor/localhost. */
export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/triage
 *
 * Recibe el cuerpo del formulario de entrada (formulario_entrada):
 * - paciente_id: string
 * - sintomas_texto: string
 * - signos_vitales?: SignosVitales
 * - nombre_paciente?: string (opcional, si no se envía se usa paciente_id)
 * - dni?: string (opcional)
 *
 * Clasifica con IA, guarda en base de datos (Consultas) y en memoria (mock), devuelve el registro.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("paciente_id" in body) ||
      !("sintomas_texto" in body)
    ) {
      return NextResponse.json(
        { error: "Faltan paciente_id o sintomas_texto" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const entrada = body as EntradaTriage;
    const paciente_id = String(entrada.paciente_id).trim();
    const sintomas_texto = String(entrada.sintomas_texto).trim();
    const signos_vitales = entrada.signos_vitales ?? {};
    const nombre_paciente =
      typeof entrada.nombre_paciente === "string" && entrada.nombre_paciente.trim()
        ? entrada.nombre_paciente.trim()
        : paciente_id;
    const dni =
      typeof entrada.dni === "string" && entrada.dni.trim() ? entrada.dni.trim() : null;

    if (!paciente_id || !sintomas_texto) {
      return NextResponse.json(
        { error: "paciente_id y sintomas_texto son obligatorios" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (sintomas_texto.length < MIN_SINTOMAS_CARACTERES) {
      return NextResponse.json(
        {
          error: `Los síntomas deben tener al menos ${MIN_SINTOMAS_CARACTERES} caracteres.`,
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const glasgow =
      entrada.glasgow &&
      typeof entrada.glasgow.puntaje_glasgow === "number" &&
      typeof entrada.glasgow.E === "number" &&
      typeof entrada.glasgow.V === "number" &&
      typeof entrada.glasgow.M === "number"
        ? {
            E: entrada.glasgow.E,
            V: entrada.glasgow.V,
            M: entrada.glasgow.M,
            puntaje_glasgow: entrada.glasgow.puntaje_glasgow,
          }
        : undefined;

    const resultadoLLM = await categorizarConLLM(
      sintomas_texto,
      signos_vitales,
      glasgow
    );

    const {
      nivel,
      explicacion_tecnica,
      pasos_a_seguir,
      diagnostico_presuntivo,
      justificacion,
      recomendacion_inmediata,
      fallback: fallbackIA,
    } = resultadoLLM;
    const nivel_gravedad = resultadoLLM.nivel_gravedad ?? nivelNombreAGravedad(nivel);
    const recomendacion =
      typeof recomendacion_inmediata === "string" && recomendacion_inmediata.trim()
        ? recomendacion_inmediata.trim()
        : generarRecomendacion(nivel_gravedad);
    const color_alerta = gravedadToColorAlerta(nivel_gravedad);

    const MENSAJE_FALLBACK =
      "Clasificación automática no disponible, diríjase a recepción";

    const registro: RegistroTriage = {
      paciente_id,
      sintomas_texto,
      nivel_gravedad,
      recomendacion,
      signos_vitales,
      fecha: new Date().toISOString(),
      nivel,
      explicacion_tecnica,
      pasos_a_seguir,
      ...(nombre_paciente ? { nombre_paciente } : {}),
      ...(dni ? { dni } : {}),
      ...(glasgow ? { glasgow } : {}),
      ...(diagnostico_presuntivo != null && diagnostico_presuntivo !== ""
        ? { diagnostico_presuntivo }
        : {}),
      ...(justificacion != null && justificacion !== "" ? { justificacion } : {}),
      ...(recomendacion_inmediata != null && recomendacion_inmediata !== ""
        ? { recomendacion_inmediata }
        : {}),
      ...(fallbackIA ? { mensaje_fallback: MENSAJE_FALLBACK } : {}),
    };

    guardarTriage(registro);

    try {
      await prisma.consulta.create({
        data: {
          nombre_paciente,
          dni,
          sintomas: sintomas_texto,
          gravedad_ia: nivel_gravedad,
          color_alerta,
        },
      });
    } catch (dbError) {
      console.error("Error al guardar consulta en BD (triaje igualmente válido):", dbError);
      // No bloqueamos el triaje: el usuario recibe el resultado aunque la BD falle
    }

    return NextResponse.json(registro, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Error al procesar el triaje" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
