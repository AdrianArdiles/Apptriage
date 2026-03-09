import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanObject } from "@/lib/clean-object";
import type { AtencionFromApi } from "@/lib/types-atenciones-api";

/** CORS para APK (Capacitor) y web. */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
} as const;

/** Body que envía el celular (mismo formato que Firestore). */
interface AtencionBody {
  id?: string;
  createdAt?: string;
  nombrePaciente?: string | null;
  pacienteId?: string | null;
  operadorId?: string | null;
  unidadId?: string | null;
  data?: unknown;
  diagnostico_codigo?: string | null;
  paramedicoNombre?: string | null;
  paramedicoEmail?: string | null;
}

function safeString(v: unknown, defaultVal: string): string {
  if (v == null) return defaultVal;
  const s = String(v).trim();
  return s === "" ? defaultVal : s;
}

/** Sanitiza recursivamente: ningún undefined llega a la base. Devuelve JSON string. */
function safeJsonSanitized(obj: unknown): string {
  if (obj == null) return "{}";
  try {
    const cleaned = cleanObject(typeof obj === "object" ? obj : {});
    return JSON.stringify(cleaned);
  } catch {
    return "{}";
  }
}

function extractSintomasTexto(data: unknown): string | null {
  if (data == null || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const v = o.sintomas_texto;
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

function parseDataJson(dataJson: string): AtencionFromApi["data"] {
  try {
    const parsed = JSON.parse(dataJson) as unknown;
    return (parsed && typeof parsed === "object" ? parsed : {}) as AtencionFromApi["data"];
  } catch {
    return {};
  }
}

/** GET /api/atenciones: lista de atenciones desde Neon, orden por fecha descendente. */
export async function GET(): Promise<NextResponse> {
  try {
    const rows = await prisma.atencion.findMany({
      orderBy: { created_at: "desc" },
    });
    const atenciones: AtencionFromApi[] = rows.map((r) => ({
      id: r.report_id ?? r.id,
      atencionId: r.id,
      createdAt: r.created_at.toISOString(),
      nombrePaciente: r.nombre_paciente,
      pacienteId: r.paciente_id,
      operadorId: r.operador_id ?? undefined,
      unidadId: r.unidad_id ?? undefined,
      sintomas_texto: r.sintomas_texto ?? undefined,
      diagnostico_codigo: r.diagnostico_codigo ?? undefined,
      data: parseDataJson(r.data),
    }));
    return NextResponse.json(atenciones, { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    console.error("[GET /api/atenciones] Error:", err);
    return NextResponse.json(
      { error: "Error al listar atenciones" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: AtencionBody;
  try {
    const raw = await request.text();
    body = (raw ? JSON.parse(raw) : {}) as AtencionBody;
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Cuerpo de la petición inválido" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Validar y aplicar valores por defecto (ningún undefined a la base)
  const nombre_paciente = safeString(body.nombrePaciente, "Sin nombre");
  const paciente_id = safeString(body.pacienteId, "sin-id");
  const paramedico_nombre = safeString(body.paramedicoNombre, "") || null;
  const paramedico_email = safeString(body.paramedicoEmail, "") || null;
  const operador_id = safeString(body.operadorId, "") || null;
  const unidad_id = safeString(body.unidadId, "") || null;
  const diagnostico_codigo = safeString(body.diagnostico_codigo, "") || null;
  const report_id = safeString(body.id, "") || null;
  const dataJson = safeJsonSanitized(body.data);
  const sintomas_texto = extractSintomasTexto(body.data);

  try {
    const atencion = await prisma.atencion.create({
      data: {
        report_id: report_id || undefined,
        nombre_paciente,
        paciente_id,
        sintomas_texto: sintomas_texto ?? undefined,
        paramedico_nombre: paramedico_nombre ?? undefined,
        paramedico_email: paramedico_email ?? undefined,
        operador_id: operador_id ?? undefined,
        unidad_id: unidad_id ?? undefined,
        diagnostico_codigo: diagnostico_codigo ?? undefined,
        data: dataJson,
      },
    });
    return NextResponse.json(
      { id: atencion.id, report_id: atencion.report_id ?? atencion.id },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[POST /api/atenciones] Error guardando:", err);
    return NextResponse.json(
      { error: "Error al guardar la atención" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/** DELETE /api/atenciones?id=xxx — elimina por Prisma id (atencionId). */
export async function DELETE(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json(
      { error: "Falta el parámetro id" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  try {
    await prisma.atencion.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    console.error("[DELETE /api/atenciones] Error:", err);
    return NextResponse.json(
      { error: "Error al eliminar la atención" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
