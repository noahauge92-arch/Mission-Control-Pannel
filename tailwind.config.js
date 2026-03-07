/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mc: {
          bg: '#06080f',
          deep: '#080c15',
          panel: '#0b1020',
          card: '#0e1528',
          border: '#1a2744',
          borderLight: '#243358',
          accent: '#f59e0b',
          accentDim: '#b45309',
          green: '#22c55e',
          greenDim: '#15803d',
          red: '#ef4444',
          redDim: '#b91c1c',
          blue: '#3b82f6',
          blueDim: '#1d4ed8',
          purple: '#a855f7',
          purpleDim: '#7e22ce',
          cyan: '#06b6d4',
          text: '#e2e8f0',
          muted: '#64748b',
          subtle: '#334155',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-amber': '0 0 20px rgba(245,158,11,0.3)',
        'glow-green': '0 0 20px rgba(34,197,94,0.3)',
        'glow-red': '0 0 20px rgba(239,68,68,0.3)',
        'glow-blue': '0 0 20px rgba(59,130,246,0.3)',
        'panel': '0 0 0 1px rgba(26,39,68,0.8), 0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'scan': 'scan 4s linear infinite',
        'flow': 'flow 2s linear infinite',
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'slideIn': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flow: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(26,39,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(26,39,68,0.3) 1px, transparent 1px)",
        'radial-glow': 'radial-gradient(ellipse at center, rgba(245,158,11,0.05) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}
