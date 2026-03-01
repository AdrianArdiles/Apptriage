/** Con IS_CAPACITOR=true (build para Android) se usa output: 'export' y se genera la carpeta 'out' que Capacitor copia con npx cap copy. En Vercel no se define IS_CAPACITOR, así las API Routes funcionan. */
const isCapacitor = process.env.IS_CAPACITOR === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isCapacitor ? { output: "export" } : {}),
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
