/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        body: ["IBM Plex Sans", "system-ui", "sans-serif"]
      },
      colors: {
        barber: "#C62828",
        charcoal: "#1C1C1C",
        canvas: "#F9FAFB",
        border: "#E5E7EB",
        text: "#374151",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
        revenue: "#2563EB",
        expense: "#111827"
      },
      boxShadow: {
        soft: "0 10px 24px -20px rgba(17, 24, 39, 0.35)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem"
      }
    }
  },
  plugins: []
};
