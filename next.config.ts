import type { NextConfig } from "next";

/** Solo en build para Capacitor (APK). En Vercel/producción web queda undefined para que las API Routes funcionen. */
const isCapacitor = process.env.IS_CAPACITOR === "true";

const nextConfig: NextConfig = {
  ...(isCapacitor && { output: "export" }),
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
