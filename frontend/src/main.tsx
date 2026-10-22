import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyTheme, useThemeStore } from './store/themeStore'
import { queryClient } from './lib/queryClient'
import { hydrateQueryClient } from './lib/offlineCache'
import { useAuthStore } from './store/authStore'

// Make sure the persisted (or system) theme is applied before first paint.
applyTheme(useThemeStore.getState().theme)

// Restore the query cache from disk so an offline reload shows the
// last-known tasks, boards and columns instead of an empty page.
hydrateQueryClient(queryClient, useAuthStore.getState().token)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

