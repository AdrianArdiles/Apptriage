import { NextResponse } from "next/server";
import type { EntradaTriage, RegistroTriage } from "@/lib/types";
import { MIN_SINTOMAS_CARACTERES } from "@/lib/types";
import { guardarTriage } from "@/lib/mock-db";
import { generarRecomendacion } from "@/lib/triage-logic";
import { categorizarConLLM, nivelNombreAGravedad } from "@/lib/triage-llm";
import { gravedadToColorAlerta } from "@/lib/color-alerta";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
} as const;

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const rawText = await request.text();
  console.log("=== TEXTO RECIBIDO ===", rawText);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawText || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Error de parseo", texto: rawText },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Faltan campos", recibido: data },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const tienePacienteId = "paciente_id" in data && data.paciente_id != null && String(data.paciente_id).trim() !== "";
    const tieneSintomas = "sintomas_texto" in data && data.sintomas_texto != null && String(data.sintomas_texto).trim().length >= MIN_SINTOMAS_CARACTERES;

    if (!tienePacienteId || !tieneSintomas) {
      return NextResponse.json(
        { error: "Faltan campos", recibido: data },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const entrada = data as unknown as EntradaTriage;
    const paciente_id = String(entrada.paciente_id).trim();
    const sintomas_texto = String(entrada.sintomas_texto).trim();
    const signos_vitales = entrada.signos_vitales ?? {};
    const nombre_paciente =
      typeof entrada.nombre_paciente === "string" && entrada.nombre_paciente.trim()
        ? entrada.nombre_paciente.trim()
        : paciente_id;
    const dni =
      typeof entrada.dni === "string" && entrada.dni.trim() ? entrada.dni.trim() : null;

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
    }

    return NextResponse.json(
      { success: true, registro },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { error: "Error al procesar el triaje" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
