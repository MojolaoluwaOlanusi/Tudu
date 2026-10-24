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
        // --- Existing live tokens (unchanged; every current class keeps working) ---
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

        // --- Mockup tokens (additive; opt-in per component in later steps) ---
        canvas: 'var(--bg-page)',
        raised: 'var(--bg-elevated)',
        subtle: 'var(--bg-hover)',
        active: 'var(--bg-active)',
        line: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        'ink-faint': 'var(--text-tertiary)',
        'ink-inverse': 'var(--text-inverse)',
        brand: {
          // DEFAULT + hover/subtle/muted are the mockup tokens.
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
          muted: 'var(--accent-muted)',
          // Existing brand colour names (kept for compatibility).
          green: '#22c55e',
          dark: '#1a1a1a',
          light: '#fafafa',
        },
        todo: 'var(--status-todo)',
        doing: 'var(--status-doing)',
        done: 'var(--status-done)',
        overdue: 'var(--status-overdue)',
      },
      fontFamily: {
        handwritten: ['"Caveat"', '"Comic Sans MS"', 'cursive'],
        brand: ['"Caveat"', '"Comic Sans MS"', 'cursive'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // JetBrains Mono first, then Tailwind's previous default chain.
        // The <link> that actually loads JetBrains Mono lands in Step 8;
        // until then the browser falls back to ui-monospace (no visual delta).
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'r-sm': 'var(--r-sm)',
        'r-md': 'var(--r-md)',
        'r-lg': 'var(--r-lg)',
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