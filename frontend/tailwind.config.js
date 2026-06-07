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
          bg: "#0B0F19",
          card: "#151D30",
          border: "#1F2E4D"
        },
        primary: {
          glow: "#3B82F6",
          accent: "#60A5FA"
        }
      }
    },
  },
  plugins: [],
}
