import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyTheme, useThemeStore } from './store/themeStore'

// Make sure the persisted (or system) theme is applied before first paint.
applyTheme(useThemeStore.getState().theme)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

