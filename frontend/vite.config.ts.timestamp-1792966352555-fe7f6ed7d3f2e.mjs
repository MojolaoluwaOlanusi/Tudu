// vite.config.ts
import { defineConfig } from "file:///C:/Users/olanu/Tudu/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/olanu/Tudu/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/olanu/Tudu/frontend/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.png", "wordmark.png", "icon.svg", "icon-maskable.svg"],
      manifest: {
        name: "Tudu",
        short_name: "Tudu",
        description: "AI Kanban + Pomodoro, with real-time sync.",
        theme_color: "#22c55e",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        categories: ["productivity", "business"],
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // The socket.io handshake must never be served from cache.
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
        importScripts: ["/push-handler.js"],
        runtimeCaching: [
          {
            // API responses: fresh when the network is there, cached when it
            // is not. 5 s timeout so a slow network falls back to cache rather
            // than freezing the UI. 200 entries x 5 min covers an average
            // session comfortably without growing the cache unbounded.
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "tudu-api",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 300 }
            }
          },
          {
            // The wordmark and icons rarely change; keep them for a month.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\.(?:png|svg|ico|woff2)$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "tudu-static",
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 3600 }
            }
          }
        ]
      },
      devOptions: {
        // The SW is noisy in dev and can serve stale HTML while iterating.
        // Enable it manually when testing the PWA experience.
        enabled: false
      }
    })
  ],
  server: {
    port: 5173
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", "dist/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/test/**", "src/**/*.d.ts", "src/types/**"]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxvbGFudVxcXFxUdWR1XFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxvbGFudVxcXFxUdWR1XFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9vbGFudS9UdWR1L2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7Ly8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlc3RcIiAvPlxyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBWaXRlUFdBKHtcclxuICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXHJcbiAgICAgIGluamVjdFJlZ2lzdGVyOiAnYXV0bycsXHJcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5wbmcnLCAnd29yZG1hcmsucG5nJywgJ2ljb24uc3ZnJywgJ2ljb24tbWFza2FibGUuc3ZnJ10sXHJcbiAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgbmFtZTogJ1R1ZHUnLFxyXG4gICAgICAgIHNob3J0X25hbWU6ICdUdWR1JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0FJIEthbmJhbiArIFBvbW9kb3JvLCB3aXRoIHJlYWwtdGltZSBzeW5jLicsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjMjJjNTVlJyxcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgIG9yaWVudGF0aW9uOiAncG9ydHJhaXQnLFxyXG4gICAgICAgIHN0YXJ0X3VybDogJy8nLFxyXG4gICAgICAgIHNjb3BlOiAnLycsXHJcbiAgICAgICAgY2F0ZWdvcmllczogWydwcm9kdWN0aXZpdHknLCAnYnVzaW5lc3MnXSxcclxuICAgICAgICBpY29uczogW1xyXG4gICAgICAgICAgeyBzcmM6ICcvaWNvbi0xOTIucG5nJywgICAgICBzaXplczogJzE5MngxOTInLCB0eXBlOiAnaW1hZ2UvcG5nJywgICAgIHB1cnBvc2U6ICdhbnknIH0sXHJcbiAgICAgICAgICB7IHNyYzogJy9pY29uLTUxMi5wbmcnLCAgICAgIHNpemVzOiAnNTEyeDUxMicsIHR5cGU6ICdpbWFnZS9wbmcnLCAgICAgcHVycG9zZTogJ2FueScgfSxcclxuICAgICAgICAgIHsgc3JjOiAnL2ljb24uc3ZnJywgICAgICAgICAgc2l6ZXM6ICdhbnknLCAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnLCBwdXJwb3NlOiAnYW55JyB9LFxyXG4gICAgICAgICAgeyBzcmM6ICcvaWNvbi1tYXNrYWJsZS5zdmcnLCBzaXplczogJ2FueScsICAgICB0eXBlOiAnaW1hZ2Uvc3ZnK3htbCcsIHB1cnBvc2U6ICdtYXNrYWJsZScgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLHN2ZyxwbmcsaWNvLHdvZmYyfSddLFxyXG4gICAgICAgIC8vIFRoZSBzb2NrZXQuaW8gaGFuZHNoYWtlIG11c3QgbmV2ZXIgYmUgc2VydmVkIGZyb20gY2FjaGUuXHJcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbL15cXC9hcGlcXC8vLCAvXlxcL3NvY2tldFxcLmlvXFwvL10sXHJcbiAgICAgICAgaW1wb3J0U2NyaXB0czogWycvcHVzaC1oYW5kbGVyLmpzJ10sXHJcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgLy8gQVBJIHJlc3BvbnNlczogZnJlc2ggd2hlbiB0aGUgbmV0d29yayBpcyB0aGVyZSwgY2FjaGVkIHdoZW4gaXRcclxuICAgICAgICAgICAgLy8gaXMgbm90LiA1IHMgdGltZW91dCBzbyBhIHNsb3cgbmV0d29yayBmYWxscyBiYWNrIHRvIGNhY2hlIHJhdGhlclxyXG4gICAgICAgICAgICAvLyB0aGFuIGZyZWV6aW5nIHRoZSBVSS4gMjAwIGVudHJpZXMgeCA1IG1pbiBjb3ZlcnMgYW4gYXZlcmFnZVxyXG4gICAgICAgICAgICAvLyBzZXNzaW9uIGNvbWZvcnRhYmx5IHdpdGhvdXQgZ3Jvd2luZyB0aGUgY2FjaGUgdW5ib3VuZGVkLlxyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAoeyB1cmwgfSkgPT4gdXJsLnBhdGhuYW1lLnN0YXJ0c1dpdGgoJy9hcGkvJyksXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdOZXR3b3JrRmlyc3QnLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAndHVkdS1hcGknLFxyXG4gICAgICAgICAgICAgIG5ldHdvcmtUaW1lb3V0U2Vjb25kczogNSxcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDIwMCwgbWF4QWdlU2Vjb25kczogMzAwIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICAvLyBUaGUgd29yZG1hcmsgYW5kIGljb25zIHJhcmVseSBjaGFuZ2U7IGtlZXAgdGhlbSBmb3IgYSBtb250aC5cclxuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgdXJsLCBzYW1lT3JpZ2luIH0pID0+XHJcbiAgICAgICAgICAgICAgc2FtZU9yaWdpbiAmJiAvXFwuKD86cG5nfHN2Z3xpY298d29mZjIpJC8udGVzdCh1cmwucGF0aG5hbWUpLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICd0dWR1LXN0YXRpYycsXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiA1MCwgbWF4QWdlU2Vjb25kczogMzAgKiAyNCAqIDM2MDAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgICAgZGV2T3B0aW9uczoge1xyXG4gICAgICAgIC8vIFRoZSBTVyBpcyBub2lzeSBpbiBkZXYgYW5kIGNhbiBzZXJ2ZSBzdGFsZSBIVE1MIHdoaWxlIGl0ZXJhdGluZy5cclxuICAgICAgICAvLyBFbmFibGUgaXQgbWFudWFsbHkgd2hlbiB0ZXN0aW5nIHRoZSBQV0EgZXhwZXJpZW5jZS5cclxuICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIF0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczLFxyXG4gIH0sXHJcbiAgdGVzdDoge1xyXG4gICAgZ2xvYmFsczogdHJ1ZSxcclxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxyXG4gICAgc2V0dXBGaWxlczogWycuL3NyYy90ZXN0L3NldHVwLnRzJ10sXHJcbiAgICBjc3M6IGZhbHNlLFxyXG4gICAgaW5jbHVkZTogWydzcmMvKiovKi57dGVzdCxzcGVjfS57dHMsdHN4fSddLFxyXG4gICAgZXhjbHVkZTogWydub2RlX21vZHVsZXMvKionLCAnZGlzdC8qKicsICdlMmUvKionXSxcclxuICAgIGNvdmVyYWdlOiB7XHJcbiAgICAgIHByb3ZpZGVyOiAndjgnLFxyXG4gICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2xjb3YnXSxcclxuICAgICAgaW5jbHVkZTogWydzcmMvKiovKi57dHMsdHN4fSddLFxyXG4gICAgICBleGNsdWRlOiBbJ3NyYy9tYWluLnRzeCcsICdzcmMvdGVzdC8qKicsICdzcmMvKiovKi5kLnRzJywgJ3NyYy90eXBlcy8qKiddLFxyXG4gICAgfSxcclxuICB9LFxyXG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQ0EsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUd4QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUEsTUFDZCxnQkFBZ0I7QUFBQSxNQUNoQixlQUFlLENBQUMsZUFBZSxnQkFBZ0IsWUFBWSxtQkFBbUI7QUFBQSxNQUM5RSxVQUFVO0FBQUEsUUFDUixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixrQkFBa0I7QUFBQSxRQUNsQixTQUFTO0FBQUEsUUFDVCxhQUFhO0FBQUEsUUFDYixXQUFXO0FBQUEsUUFDWCxPQUFPO0FBQUEsUUFDUCxZQUFZLENBQUMsZ0JBQWdCLFVBQVU7QUFBQSxRQUN2QyxPQUFPO0FBQUEsVUFDTCxFQUFFLEtBQUssaUJBQXNCLE9BQU8sV0FBVyxNQUFNLGFBQWlCLFNBQVMsTUFBTTtBQUFBLFVBQ3JGLEVBQUUsS0FBSyxpQkFBc0IsT0FBTyxXQUFXLE1BQU0sYUFBaUIsU0FBUyxNQUFNO0FBQUEsVUFDckYsRUFBRSxLQUFLLGFBQXNCLE9BQU8sT0FBVyxNQUFNLGlCQUFpQixTQUFTLE1BQU07QUFBQSxVQUNyRixFQUFFLEtBQUssc0JBQXNCLE9BQU8sT0FBVyxNQUFNLGlCQUFpQixTQUFTLFdBQVc7QUFBQSxRQUM1RjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLGNBQWMsQ0FBQyxzQ0FBc0M7QUFBQTtBQUFBLFFBRXJELDBCQUEwQixDQUFDLFlBQVksaUJBQWlCO0FBQUEsUUFDeEQsZUFBZSxDQUFDLGtCQUFrQjtBQUFBLFFBQ2xDLGdCQUFnQjtBQUFBLFVBQ2Q7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBS0UsWUFBWSxDQUFDLEVBQUUsSUFBSSxNQUFNLElBQUksU0FBUyxXQUFXLE9BQU87QUFBQSxZQUN4RCxTQUFTO0FBQUEsWUFDVCxTQUFTO0FBQUEsY0FDUCxXQUFXO0FBQUEsY0FDWCx1QkFBdUI7QUFBQSxjQUN2QixZQUFZLEVBQUUsWUFBWSxLQUFLLGVBQWUsSUFBSTtBQUFBLFlBQ3BEO0FBQUEsVUFDRjtBQUFBLFVBQ0E7QUFBQTtBQUFBLFlBRUUsWUFBWSxDQUFDLEVBQUUsS0FBSyxXQUFXLE1BQzdCLGNBQWMsMkJBQTJCLEtBQUssSUFBSSxRQUFRO0FBQUEsWUFDNUQsU0FBUztBQUFBLFlBQ1QsU0FBUztBQUFBLGNBQ1AsV0FBVztBQUFBLGNBQ1gsWUFBWSxFQUFFLFlBQVksSUFBSSxlQUFlLEtBQUssS0FBSyxLQUFLO0FBQUEsWUFDOUQ7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFlBQVk7QUFBQTtBQUFBO0FBQUEsUUFHVixTQUFTO0FBQUEsTUFDWDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxNQUFNO0FBQUEsSUFDSixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixZQUFZLENBQUMscUJBQXFCO0FBQUEsSUFDbEMsS0FBSztBQUFBLElBQ0wsU0FBUyxDQUFDLCtCQUErQjtBQUFBLElBQ3pDLFNBQVMsQ0FBQyxtQkFBbUIsV0FBVyxRQUFRO0FBQUEsSUFDaEQsVUFBVTtBQUFBLE1BQ1IsVUFBVTtBQUFBLE1BQ1YsVUFBVSxDQUFDLFFBQVEsTUFBTTtBQUFBLE1BQ3pCLFNBQVMsQ0FBQyxtQkFBbUI7QUFBQSxNQUM3QixTQUFTLENBQUMsZ0JBQWdCLGVBQWUsaUJBQWlCLGNBQWM7QUFBQSxJQUMxRTtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
