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
          dark: '#1a1a1a',
          light: '#fafafa',
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
        // A short spring used for cards and popovers appearing.
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '60%': { transform: 'scale(1.01) translateY(0)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'pop-in': 'pop-in 0.28s cubic-bezier(0.34, 1.4, 0.64, 1)',
      },
    },
  },
  plugins: [],
}

