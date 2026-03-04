/**
 * Build dual:
 * - Android (Capacitor): npm run build:android → export estático en /out
 * - Firebase Hosting: npm run build:hosting → mismo export estático en /out (SPA en firebase.json)
 * - Web con SSR/API: BUILD_WEB=1 npm run build:web → build estándar Next.js (sin export)
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  ...(process.env.BUILD_WEB !== "1" ? { output: "export" } : {}),
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
