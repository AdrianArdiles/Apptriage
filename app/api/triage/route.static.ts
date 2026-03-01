/** Stub para build con output: 'export' (Capacitor). La APK usa la API desplegada en Vercel. */
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function POST(): NextResponse {
  return NextResponse.json(
    { error: "En build estático use la API en https://apptriage.vercel.app/api/triage" },
    { status: 404 }
  );
}
