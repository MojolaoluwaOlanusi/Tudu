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
        brand: {
          green: '#22c55e',
          dark: '#1a1a1a',
          light: '#fafafa',
        },
      },
      fontFamily: {
        handwritten: ['"Comic Sans MS"', '"Chalkboard SE"', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
