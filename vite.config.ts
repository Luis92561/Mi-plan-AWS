import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    ...(mode === 'test'
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: ['theme-init.js', 'favicon.svg'],
            manifest: {
              name: 'Mi Plan AWS',
              short_name: 'Mi Plan AWS',
              description: 'Panel privado para trackear la ruta de certificaciones AWS',
              lang: 'es',
              start_url: './index.html',
              scope: './',
              display: 'standalone',
              background_color: '#0A0B0D',
              theme_color: '#0A0B0D',
              icons: [
                { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
              navigateFallback: 'index.html',
              cleanupOutdatedCaches: true,
            },
          }),
        ]),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Solo React va en un chunk propio y estable. `recharts`, `zod` y `jszip`
        // quedan dentro de las pantallas que los usan (carga bajo demanda).
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
}));
