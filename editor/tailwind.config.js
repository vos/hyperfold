/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0a0d14',
          surface: '#121722',
          card: '#182030',
          border: '#243046',
          hover: '#1e293b',
          cyan: '#00f0ff',
          neonBlue: '#0088ff',
          neonPink: '#ff007f',
          neonGreen: '#00ff66',
          neonYellow: '#ffcc00',
          neonPurple: '#d000ff',
        }
      }
    },
  },
  plugins: [],
}

