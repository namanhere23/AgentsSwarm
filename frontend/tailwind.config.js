/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          deep: "var(--color-primary-deep)",
          press: "var(--color-primary-press)",
          soft: "var(--color-primary-soft)",
          "bg-subdued-hover": "var(--color-primary-bg-subdued-hover)",
        },
        brand: {
          dark: {
            900: "var(--color-brand-dark-900)",
          }
        },
        ink: {
          DEFAULT: "var(--color-ink)",
          secondary: "var(--color-ink-secondary)",
          mute: "var(--color-ink-mute)",
          mute2: "var(--color-ink-mute-2)",
        },
        "on-primary": "var(--color-on-primary)",
        canvas: {
          DEFAULT: "var(--color-canvas)",
          soft: "var(--color-canvas-soft)",
          cream: "var(--color-canvas-cream)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          elevated: "var(--color-surface-elevated)",
        },
        edge: {
          DEFAULT: "var(--color-edge-default)",
          hover: "var(--color-edge-hover)",
        },
        hairline: {
          DEFAULT: "var(--color-hairline)",
          input: "var(--color-hairline-input)",
        },
        ruby: "var(--color-ruby)",
        magenta: "var(--color-magenta)",
        lemon: "var(--color-lemon)",
        "shadow-blue": "var(--color-shadow-blue)",
        cobalt: "var(--color-cobalt)",
        dark: {
          bg: "var(--color-dark-bg)",
          card: "var(--color-dark-card)",
          border: "var(--color-dark-border)",
        }
      },
      spacing: {
        xxs: "var(--spacing-xxs)",
        xs: "var(--spacing-xs)",
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
        xl: "var(--spacing-xl)",
        xxl: "var(--spacing-xxl)",
        huge: "var(--spacing-huge)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
