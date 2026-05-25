/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light-first product palette. `ink` is the neutral scale used for
        // page bg, surfaces, borders. `text-*` is for foreground.
        // `phosphor` is the green accent kept for live/online states.
        ink: {
          950: '#f7f8fa', // page bg (off-white, leaning grey)
          900: '#ffffff', // card surface
          800: '#f3f4f6', // subtle hover / inset bg
          700: '#eceef1', // subtle bg 2
          600: '#e5e7eb',
          500: '#d1d5db',
          400: '#e5e7eb', // dominant border in code, kept subtle
          300: '#cbd5e1',
        },
        phosphor: {
          DEFAULT: '#16a34a',
          dim: '#15803d',
          bright: '#22c55e',
          glow: 'rgba(22, 163, 74, 0.10)',
          soft: 'rgba(22, 163, 74, 0.08)',
        },
        amber: {
          DEFAULT: '#d97706',
          dim: '#b45309',
        },
        danger: {
          DEFAULT: '#dc2626',
          dim: '#b91c1c',
        },
        text: {
          primary: '#0f172a',
          secondary: '#475569',
          muted: '#64748b',
          faint: '#94a3b8',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      },
      letterSpacing: {
        widest: '0.14em',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05)',
        elevated:
          '0 4px 12px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)',
        ring: '0 0 0 4px rgba(22,163,74,0.12)',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        boot: 'boot 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        boot: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
