/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic design tokens driven by CSS variables (see src/index.css).
        // These switch automatically with the `.dark` class.
        page: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        hairline: 'var(--color-border)',
        ink: 'var(--color-text)',
        'ink-muted': 'var(--color-text-muted)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          strong: 'var(--color-accent-strong)',
          soft: 'var(--color-accent-soft)',
        },
        // Brand palette (kept for backwards compatibility).
        brand: {
          green: '#22c55e',
          dark: '#121417',
          light: '#f7f5ef',
        },
      },
      fontFamily: {
        handwritten: ['"Caveat"', '"Comic Sans MS"', 'cursive'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        surface: 'var(--shadow-surface)',
        'surface-lg': '0 24px 48px -24px rgba(0, 0, 0, 0.4)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}

