/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#14B8A6'
        //primary: '#0D9488'
        // primary: '#F5385D'
      }
    },
  },
  plugins: [],
}

