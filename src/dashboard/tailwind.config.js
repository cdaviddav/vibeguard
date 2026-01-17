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
          bg: '#0a0e27',
          surface: '#141b2d',
          border: '#1a2332',
          accent: '#00ff88',
          accentHover: '#00cc6f',
          text: '#e0e7ff',
          textMuted: '#8892b0',
        },
      },
      fontFamily: {
        mono: ['Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}

