/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0d253d", // ink
          card: "#1c1e54", // brand-dark-900
          border: "#273951" // ink-secondary
        },
        primary: {
          DEFAULT: "#533afd",
          deep: "#4434d4",
          press: "#2e2b8c",
          soft: "#665efd",
          bgSubduedHover: "#b9b9f9"
        },
        ink: {
          DEFAULT: "#0d253d",
          secondary: "#273951",
          mute: "#64748d",
          mute2: "#61718a"
        },
        canvas: {
          DEFAULT: "#ffffff",
          soft: "#f6f9fc",
          cream: "#f5e9d4"
        },
        hairline: {
          DEFAULT: "#e3e8ee",
          input: "#a8c3de"
        },
        accent: {
          ruby: "#ea2261",
          magenta: "#f96bee",
          lemon: "#9b6829",
          shadowBlue: "#003770"
        }
      },
      fontFamily: {
        sans: ["sohne-var", "'SF Pro Display'", "system-ui", "-apple-system", "sans-serif"],
        display: ["sohne-var", "'SF Pro Display'", "system-ui", "-apple-system", "sans-serif"]
      }
    },
  },
  plugins: [],
}
