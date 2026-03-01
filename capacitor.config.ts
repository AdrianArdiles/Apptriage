import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.adrian.triaje",
  appName: "TriajeMedico",
  webDir: "out",
  server: {
    androidScheme: "http",
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
