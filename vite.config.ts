import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/// <reference types="vitest" />
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-icon-192.png', 'pwa-icon-512.png', 'offline.html'],
        manifest: {
          name: 'Painel da Ala',
          short_name: 'Painel da Ala',
          description: 'Central de avisos, escalas e atividades da ala 1.',
          theme_color: '#0c4a6e',
          background_color: '#171717',
          display: 'standalone',
          start_url: '/',
          orientation: 'portrait',
          icons: [
            {
              src: '/pwa-icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/pwa-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          // Cacheia todos os assets estáticos gerados pelo Vite
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // Estratégia Network First para navegação (sempre tenta buscar a versão mais recente)
          navigateFallback: '/offline.html',
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              // Fonts e assets externos — Cache First
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
        devOptions: {
          // Habilita o service worker em modo dev para testes
          enabled: false,
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__APP_VERSION__': JSON.stringify(Date.now().toString()),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      setupFiles: [],
    },
  };
});
