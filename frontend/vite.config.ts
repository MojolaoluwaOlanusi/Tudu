/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.png', 'wordmark.png', 'icon.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'Tudu',
        short_name: 'Tudu',
        description: 'AI Kanban + Pomodoro, with real-time sync.',
        theme_color: '#22c55e',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['productivity', 'business'],
        icons: [
          { src: '/icon-192.png',      sizes: '192x192', type: 'image/png',     purpose: 'any' },
          { src: '/icon-512.png',      sizes: '512x512', type: 'image/png',     purpose: 'any' },
          { src: '/icon.svg',          sizes: 'any',     type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon-maskable.svg', sizes: 'any',     type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The socket.io handshake must never be served from cache.
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
        runtimeCaching: [
          {
            // API responses: fresh when the network is there, cached when it
            // is not. 5 s timeout so a slow network falls back to cache rather
            // than freezing the UI. 200 entries x 5 min covers an average
            // session comfortably without growing the cache unbounded.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tudu-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 300 },
            },
          },
          {
            // The wordmark and icons rarely change; keep them for a month.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\.(?:png|svg|ico|woff2)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'tudu-static',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
        ],
      },
      devOptions: {
        // The SW is noisy in dev and can serve stale HTML while iterating.
        // Enable it manually when testing the PWA experience.
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.d.ts', 'src/types/**'],
    },
  },
});