/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Control Room palette: deep cool blacks, phosphor-green accent, restrained
        ink: {
          950: '#06080b',
          900: '#0a0d12',
          800: '#10141a',
          700: '#161b22',
          600: '#1c2230',
          500: '#252b38',
          400: '#2a3038',
          300: '#363c47',
        },
        phosphor: {
          DEFAULT: '#5dd674',
          dim: '#3da856',
          bright: '#7fe695',
          glow: 'rgba(93, 214, 116, 0.18)',
        },
        amber: {
          DEFAULT: '#e8a849',
          dim: '#b07d2e',
        },
        danger: {
          DEFAULT: '#ef5350',
          dim: '#a8312e',
        },
        text: {
          primary: '#e8e6e1',
          secondary: '#9aa1ac',
          muted: '#5b626d',
          faint: '#3a4049',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
        sans: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.08em' }],
      },
      letterSpacing: {
        widest: '0.18em',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        blink: 'blink 1.1s steps(2, start) infinite',
        scan: 'scan 4s linear infinite',
        boot: 'boot 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        boot: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        grid: `linear-gradient(rgba(93,214,116,0.025) 1px, transparent 1px),
               linear-gradient(90deg, rgba(93,214,116,0.025) 1px, transparent 1px)`,
        'grid-bright': `linear-gradient(rgba(93,214,116,0.06) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(93,214,116,0.06) 1px, transparent 1px)`,
      },
      backgroundSize: {
        grid: '32px 32px',
      },
    },
  },
  plugins: [],
};
