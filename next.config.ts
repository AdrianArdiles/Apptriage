import type { NextConfig } from "next";

const isCapacitor = process.env.IS_CAPACITOR === "true";

const nextConfig: NextConfig = {
  ...(isCapacitor && { output: "export" }),
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
