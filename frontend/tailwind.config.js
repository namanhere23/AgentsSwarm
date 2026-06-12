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
          DEFAULT: "#3b82f6",
          deep: "#2563eb",
          press: "#1d4ed8",
          soft: "#60a5fa",
          "bg-subdued-hover": "rgba(59, 130, 246, 0.1)",
        },
        brand: {
          dark: {
            900: "#020617",
          }
        },
        ink: {
          DEFAULT: "#f8fafc",
          secondary: "#cbd5e1",
          mute: "#94a3b8",
          mute2: "#64748b",
        },
        "on-primary": "#ffffff",
        canvas: {
          DEFAULT: "#09090b",
          soft: "#18181b",
          cream: "#27272a",
        },
        hairline: {
          DEFAULT: "rgba(255, 255, 255, 0.1)",
          input: "rgba(255, 255, 255, 0.2)",
        },
        ruby: "#e11d48",
        magenta: "#d946ef",
        lemon: "#eab308",
        "shadow-blue": "rgba(59, 130, 246, 0.3)"
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
