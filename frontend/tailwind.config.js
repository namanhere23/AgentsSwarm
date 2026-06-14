/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Primary palette */
        primary: {
          DEFAULT: "#3b82f6",
          d:       "#2563eb",
          l:       "#60a5fa",
        },
        magenta: "#d946ef",
        ruby:    "#e11d48",
        emerald: "#10b981",
        amber:   "#f59e0b",
        cyan:    "#06b6d4",

        /* Canvas / surfaces */
        canvas: {
          DEFAULT: "#000000",
          soft:    "#09090b",
          1:       "#111113",
          2:       "#18181b",
          3:       "#27272a",
        },

        /* Ink / text */
        ink: {
          DEFAULT: "#ffffff",
          2:       "#e2e8f0",
          3:       "#94a3b8",
          4:       "#475569",
          5:       "#334155",
        },

        /* Borders */
        border: {
          DEFAULT: "rgba(255,255,255,0.07)",
          md:      "rgba(255,255,255,0.12)",
          hi:      "rgba(255,255,255,0.20)",
        },

        /* Legacy aliases — keep so nothing breaks */
        "dark-bg":    "#000000",
        "dark-card":  "#111113",
        "dark-border":"rgba(255,255,255,0.07)",
        "accent-lemon":"#f59e0b",
        "accent-ruby": "#e11d48",
        "hairline": {
          DEFAULT: "rgba(255,255,255,0.07)",
          input:   "rgba(255,255,255,0.12)",
        },
      },

      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },

      fontSize: {
        'display-2xl': ['72px', { lineHeight: '1.0', letterSpacing: '-2px', fontWeight: '700' }],
        'display-xl':  ['56px', { lineHeight: '1.05', letterSpacing: '-1.5px' }],
        'display-lg':  ['40px', { lineHeight: '1.1',  letterSpacing: '-1px' }],
        'display-md':  ['32px', { lineHeight: '1.1',  letterSpacing: '-0.5px' }],
        'display-sm':  ['24px', { lineHeight: '1.2',  letterSpacing: '-0.3px' }],
      },

      boxShadow: {
        'glow-blue':    '0 0 20px rgba(59, 130, 246, 0.4)',
        'glow-magenta': '0 0 20px rgba(217, 70, 239, 0.4)',
        'glow-ruby':    '0 0 16px rgba(225, 29, 72, 0.4)',
        'glow-emerald': '0 0 16px rgba(16, 185, 129, 0.4)',
        'glow-amber':   '0 0 16px rgba(245, 158, 11, 0.4)',
        'card':         '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)',
        'card-hover':   '0 2px 8px rgba(0,0,0,0.5), 0 16px 40px rgba(0,0,0,0.4)',
      },

      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #3b82f6, #d946ef)',
        'gradient-blue':  'linear-gradient(135deg, #3b82f6, #2563eb)',
        'gradient-shimmer': 'linear-gradient(90deg, #3b82f6 0%, #d946ef 50%, #3b82f6 100%)',
      },

      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)'   },
          '50%':      { opacity: '0.8', transform: 'scale(1.05)' },
        },
        'ping-ring': {
          '0%':   { transform: 'scale(1)',   opacity: '0.8' },
          '100%': { transform: 'scale(2.2)', opacity: '0'   },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)'    },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)'  },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%'   },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        'wave-bounce': {
          '0%, 100%': { height: '6px',  opacity: '0.4' },
          '50%':      { height: '24px', opacity: '1'   },
        },
      },

      animation: {
        'shimmer':     'shimmer 2s linear infinite',
        'glow-pulse':  'glow-pulse 3s ease-in-out infinite',
        'ping-ring':   'ping-ring 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-up':     'fade-up 0.5s ease-out forwards',
        'float':       'float 3s ease-in-out infinite',
        'gradient-x':  'gradient-x 4s ease infinite',
        'wave-bounce': 'wave-bounce 0.8s ease-in-out infinite',
      },

      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
        pill: 'var(--radius-pill)',
      },
    },
  },
  plugins: [],
}
