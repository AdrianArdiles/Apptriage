/** Export estático: npm run build genera la carpeta /out para Capacitor (webDir: 'out'). */
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
