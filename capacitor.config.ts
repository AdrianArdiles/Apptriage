import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adrian.triaje',
  appName: 'TriajeMedico',
  webDir: 'out',
  server: {
    androidScheme: 'https', // Esto es vital para que Android acepte la conexión
    cleartext: true         // Permite conexiones de prueba si algo falla
  },
  plugins: {
    CapacitorHttp: {
      enabled: false, // Desactivamos la interceptación para que el fetch sea puro
    },
  },
};

export default config;