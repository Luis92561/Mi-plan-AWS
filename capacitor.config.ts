import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capa nativa (Android) para llevar la app al mÃ³vil como APK, sin cuentas ni tiendas.
 * El build web se empaqueta en `dist/` y se sirve desde los assets de la app
 * (`https://localhost`, origen seguro) de modo que IndexedDB y el service worker
 * funcionan igual que en el navegador, pero **sin conexiÃ³n** desde el primer momento.
 */
const config: CapacitorConfig = {
  appId: 'com.miplan.aws',
  appName: 'Mi Plan AWS',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;

