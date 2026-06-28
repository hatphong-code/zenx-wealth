/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'zx-bg':          'var(--zx-bg)',
        'zx-surface':     'var(--zx-surface)',
        'zx-surface-2':   'var(--zx-surface-2)',
        'zx-text':        'var(--zx-text)',
        'zx-text-soft':   'var(--zx-text-soft)',
        'zx-line':        'var(--zx-line)',
        'zx-accent':      'var(--zx-accent)',
        'zx-accent-soft': 'var(--zx-accent-soft)',
        'zx-maintain':    'var(--zx-maintain)',
        'zx-positive':    'var(--zx-positive)',
        'zx-positive-soft':'var(--zx-positive-soft)',
        'zx-gold':        'var(--zx-gold-fg)',
        'zx-gold-soft':   'var(--zx-gold-fg-soft)',
        'zx-on-accent':   'var(--zx-on-accent)',
        'zx-icon-bg':     'var(--zx-icon-bg)',
      },
      borderRadius: {
        'zx':    'var(--zx-radius)',
        'zx-sm': 'var(--zx-radius-sm)',
      },
      fontFamily: {
        'zx-body':    ['var(--zx-font-body)'],
        'zx-head':    ['var(--zx-font-head)'],
        'zx-display': ['var(--zx-font-display)'],
      },
      boxShadow: {
        'zx': 'var(--zx-shadow)',
      },
      ringColor: {
        'zx-accent': 'var(--zx-accent)',
      },
      ringOffsetColor: {
        'zx-bg': 'var(--zx-bg)',
      },
      keyframes: {
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(1rem)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'slideInRight': 'slideInRight 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
