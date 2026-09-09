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
        military: {
          50: '#f4f6f0',
          100: '#e5ebd9',
          200: '#ccd8b5',
          300: '#adbf8c',
          400: '#8fa667',
          500: '#738b4c',
          600: '#5a6e3b',
          700: '#45542f',
          800: '#384328',
          900: '#222919',
          950: '#14190e',
        },
        darkslate: {
          800: '#1e2530',
          850: '#171c26',
          900: '#0f141c',
          950: '#090d13',
        }
      },
      fontFamily: {
        sans: ['Cairo', 'Segoe UI', 'Tahoma', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
