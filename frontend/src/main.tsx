import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/brand.css';
import './styles/density.css';
import './lib/axiosSetup';

// Dynamic imports (React.lazy) can reference chunk filenames that
// were removed by a deploy. When the service worker is still serving
// the old index.html, the chunk 404s and React.lazy throws. Vite
// fires this event before the throw, so reload once to fetch the
// new index.html and pick up the current chunk names. A 10s guard
// prevents a reload loop if the SW itself is stuck.
if (typeof window !== 'undefined') {
  window.addEventListener(
    'vite:preloadError',
    ((event: Event) => {
      const e = event as CustomEvent;
      e.preventDefault();
      const key = 'tudu.chunk-reload';
      const last = Number(sessionStorage.getItem(key) ?? '0');
      if (Date.now() - last < 10_000) {
        console.error('[chunk-load] repeated failure; not reloading again', e);
        return;
      }
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }) as EventListener,
  );
}
import { applyTheme, useThemeStore } from './store/themeStore';
import { applyDensity, getDensity } from './lib/density';
import { queryClient } from './lib/queryClient';
import { hydrateQueryClient } from './lib/offlineCache';
import { useAuthStore } from './store/authStore';

// Initialize Sentry before any other app code runs.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.2,
  });
}

// Make sure the persisted (or system) theme is applied before first paint.
applyTheme(useThemeStore.getState().theme);

// Make sure density (compact vs comfortable) is applied before first paint.
applyDensity(getDensity());

// Restore the query cache from disk so an offline reload shows the
// last-known tasks, boards and columns instead of an empty page.
hydrateQueryClient(queryClient, useAuthStore.getState().token);

// Page-scroll parity with the mockup: the scrollbar is invisible at rest
// and fades in briefly during scrolling. CSS in index.css does the visual
// work; this just toggles `.is-scrolling` on <html> for 800ms per scroll.
(function attachScrollbarAutoHide() {
  if (typeof window === 'undefined') return;
  let timer: number | undefined;
  const onScroll = () => {
    document.documentElement.classList.add('is-scrolling');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      document.documentElement.classList.remove('is-scrolling');
    }, 800);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);