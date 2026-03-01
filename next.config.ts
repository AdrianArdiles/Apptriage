import type { NextConfig } from "next";

/** Solo en build para Capacitor (APK). En Vercel no se define IS_CAPACITOR, así que output queda undefined y las API Routes (POST /api/triage, etc.) funcionan. */
const isCapacitor = process.env.IS_CAPACITOR === "true";

const nextConfig: NextConfig = {
  ...(isCapacitor ? { output: "export" as const } : {}),
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
