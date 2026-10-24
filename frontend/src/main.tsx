import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/brand.css';
import './styles/density.css';
import './lib/axiosSetup';
import { applyTheme, useThemeStore } from './store/themeStore';
import { applyDensity, getDensity } from './lib/density';
import { queryClient } from './lib/queryClient';
import { hydrateQueryClient } from './lib/offlineCache';
import { useAuthStore } from './store/authStore';

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