/**
 * Build dual:
 * - Android (Capacitor): npm run build:android → export estático en /out
 * - Web (Vercel/Netlify/Firebase Hosting): BUILD_WEB=1 npm run build → build estándar Next.js
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  ...(process.env.BUILD_WEB !== "1" ? { output: "export" } : {}),
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
