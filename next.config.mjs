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

  // CORS para que la APK (Capacitor: capacitor://localhost, http://localhost) y la web puedan llamar a /api/*
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
