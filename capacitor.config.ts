import type { CapacitorConfig } from "@capacitor/cli";

/**
 * ID de cliente web (Firebase → Authentication → Google → Web SDK).
 * Reemplazá por tu ID que termina en .apps.googleusercontent.com
 */
const WEB_CLIENT_ID = "882958082764-d5ddvhafpj21gbn583a6ds7bsa1cj3ds.apps.googleusercontent.com";

const config: CapacitorConfig = {
  appId: "com.adrian.triaje",
  appName: "Ambulancia Pro",
  webDir: "out",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: { enabled: true },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: WEB_CLIENT_ID,
      clientId: WEB_CLIENT_ID,
      androidClientId: WEB_CLIENT_ID,
    },
  },
};

export default config;
