/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium dark mode palette - Deep Slate/Zinc
        vg: {
          // Base backgrounds - ultra deep
          bg: '#09090b', // zinc-950
          bgAlt: '#0c0c10', // slightly lighter
          bgElevated: '#111113', // card backgrounds
          
          // Glass surfaces
          glass: 'rgba(255, 255, 255, 0.03)',
          glassHover: 'rgba(255, 255, 255, 0.06)',
          glassBorder: 'rgba(255, 255, 255, 0.08)',
          glassStrong: 'rgba(255, 255, 255, 0.05)',
          
          // Primary accent - Indigo/Violet spectrum
          indigo: '#6366f1',
          indigoDark: '#4f46e5',
          indigoLight: '#818cf8',
          violet: '#8b5cf6',
          violetDark: '#7c3aed',
          violetLight: '#a78bfa',
          
          // Accent colors - muted, premium feel
          cyan: '#22d3ee',
          cyanMuted: '#0891b2',
          
          // Status - desaturated for premium feel
          success: '#10b981',
          successMuted: 'rgba(16, 185, 129, 0.15)',
          warning: '#f59e0b',
          warningMuted: 'rgba(245, 158, 11, 0.15)',
          error: '#ef4444',
          errorMuted: 'rgba(239, 68, 68, 0.15)',
          
          // Text hierarchy
          text: '#fafafa', // zinc-50 - primary
          textSecondary: '#a1a1aa', // zinc-400 - secondary
          textMuted: '#71717a', // zinc-500 - muted
          textDim: '#52525b', // zinc-600 - very muted
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        // Oracle glow - the signature effect
        'oracle': '0 0 20px rgba(99, 102, 241, 0.2)',
        'oracle-lg': '0 0 40px rgba(99, 102, 241, 0.25)',
        'oracle-pulse': '0 0 60px rgba(99, 102, 241, 0.3)',
        
        // Accent glows
        'glow-indigo': '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.3)',
        'glow-success': '0 0 15px rgba(16, 185, 129, 0.25)',
        'glow-warning': '0 0 15px rgba(245, 158, 11, 0.25)',
        'glow-error': '0 0 15px rgba(239, 68, 68, 0.25)',
        
        // Subtle elevation
        'elevation-sm': '0 2px 8px rgba(0, 0, 0, 0.4)',
        'elevation-md': '0 4px 16px rgba(0, 0, 0, 0.5)',
        'elevation-lg': '0 8px 32px rgba(0, 0, 0, 0.6)',
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(99, 102, 241, 0.35)',
            borderColor: 'rgba(99, 102, 241, 0.5)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
