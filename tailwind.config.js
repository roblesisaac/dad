/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        white: '#f3f3ee',
        gray: {
          50: '#e9e9e2',
          100: '#e3e3d8',
          200: '#d5d5c5',
          300: '#c7c7b5',
          400: '#a3a391',
          500: '#737365',
          600: '#52524a',
          700: '#40403a',
          800: '#262622',
          900: '#171714',
        }
      }
    },
  },
  plugins: [],
} 