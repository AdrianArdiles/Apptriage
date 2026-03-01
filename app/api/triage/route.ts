import { NextResponse } from "next/server";
import type { EntradaTriage, RegistroTriage } from "@/lib/types";
import { MIN_SINTOMAS_CARACTERES } from "@/lib/types";
import { guardarTriage } from "@/lib/mock-db";
import { generarRecomendacion } from "@/lib/triage-logic";
import { categorizarConLLM, nivelNombreAGravedad } from "@/lib/triage-llm";
import { gravedadToColorAlerta } from "@/lib/color-alerta";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** CORS abierto para que la APK (Capacitor) y la web puedan llamar sin bloqueos. */
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
        { error: "Datos incompletos", recibido: data },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const nombreVal = String((data.nombre_paciente ?? data.nombre ?? "").toString()).trim();
    const dniVal = String((data.dni ?? "").toString()).trim();
    const tienePacienteId = "paciente_id" in data && data.paciente_id != null && String(data.paciente_id).trim() !== "";
    const tieneSintomas = "sintomas_texto" in data && data.sintomas_texto != null && String(data.sintomas_texto).trim().length >= MIN_SINTOMAS_CARACTERES;
    const tieneNombre = nombreVal !== "";
    const tieneDni = dniVal !== "";
    const tieneAlgunIdentificador = tieneNombre || tieneDni;

    if (!tienePacienteId || !tieneSintomas || !tieneAlgunIdentificador) {
      return NextResponse.json(
        { error: "Datos incompletos", recibido: data },
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
    const hora_inicio_atencion =
      typeof entrada.hora_inicio_atencion === "string" && entrada.hora_inicio_atencion.trim()
        ? entrada.hora_inicio_atencion.trim()
        : undefined;
    const blood_loss = typeof entrada.blood_loss === "string" && entrada.blood_loss.trim() ? entrada.blood_loss.trim() : undefined;
    const airway_status = typeof entrada.airway_status === "string" && entrada.airway_status.trim() ? entrada.airway_status.trim() : undefined;
    const respiration_rate = typeof entrada.respiration_rate === "number" ? entrada.respiration_rate : undefined;
    const pulse = typeof entrada.pulse === "number" ? entrada.pulse : undefined;
    const bp_systolic = typeof entrada.bp_systolic === "number" ? entrada.bp_systolic : undefined;
    const bp_diastolic = typeof entrada.bp_diastolic === "number" ? entrada.bp_diastolic : undefined;
    const glasgow_score = typeof entrada.glasgow_score === "number" ? entrada.glasgow_score : (glasgow?.puntaje_glasgow);

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
      ...(hora_inicio_atencion ? { hora_inicio_atencion } : {}),
      ...(blood_loss != null ? { blood_loss } : {}),
      ...(airway_status != null ? { airway_status } : {}),
      ...(respiration_rate != null ? { respiration_rate } : {}),
      ...(pulse != null ? { pulse } : {}),
      ...(bp_systolic != null ? { bp_systolic } : {}),
      ...(bp_diastolic != null ? { bp_diastolic } : {}),
      ...(glasgow_score != null ? { glasgow_score } : {}),
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
