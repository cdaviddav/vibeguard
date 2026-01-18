/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vibeguard: {
          // Base background - deep dark mode
          bg: '#0a0a0f', // zinc-950 equivalent, very dark navy/slate
          bgSecondary: '#111827', // slightly lighter dark
          // Primary accents - Electric Indigo & Vibrant Violet
          primary: '#6366f1', // indigo-500 (Electric Indigo)
          primaryDark: '#4f46e5', // indigo-600
          primaryLight: '#818cf8', // indigo-400
          violet: '#8b5cf6', // violet-500 (Vibrant Violet)
          violetDark: '#7c3aed', // violet-600
          violetLight: '#a78bfa', // violet-400
          // Status colors
          success: '#10b981', // emerald-500 (Neon Green for "Guard")
          successDark: '#059669', // emerald-600
          successLight: '#34d399', // emerald-400
          warning: '#f59e0b', // amber-500 (Gold)
          warningDark: '#d97706', // amber-600
          warningLight: '#fbbf24', // amber-400
          error: '#f43f5e', // rose-500 (Crimson)
          errorDark: '#e11d48', // rose-600
          errorLight: '#fb7185', // rose-400
          // Glassmorphism surfaces
          glass: 'rgba(255, 255, 255, 0.05)',
          glassHover: 'rgba(255, 255, 255, 0.08)',
          glassBorder: 'rgba(255, 255, 255, 0.1)',
          // Text
          text: '#e4e4e7', // zinc-200
          textMuted: '#a1a1aa', // zinc-400
          textSecondary: '#71717a', // zinc-500
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(99, 102, 241, 0.4)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.4)',
        'glow-warning': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glow-error': '0 0 20px rgba(244, 63, 94, 0.4)',
        'glow-primary-lg': '0 0 40px rgba(99, 102, 241, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}



