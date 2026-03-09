import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
} as const;

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: { uid?: string; email?: string };
  try {
    const raw = await request.text();
    body = (raw ? JSON.parse(raw) : {}) as { uid?: string; email?: string };
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const uid = typeof body?.uid === "string" ? body.uid.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!uid) {
    return NextResponse.json(
      { error: "uid es obligatorio" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const now = new Date();
  const emailVal = email || "";

  try {
    const user = await prisma.user.upsert({
      where: { uid },
      create: {
        uid,
        email: emailVal,
        role: "USER",
        lastLogin: now,
      },
      update: {
        lastLogin: now,
        ...(emailVal ? { email: emailVal } : {}),
      },
    });
    return NextResponse.json(
      { id: user.id, uid: user.uid, role: user.role },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[POST /api/users/sync] Error:", err);
    return NextResponse.json(
      { error: "Error al sincronizar usuario" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
