import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Lora", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ink: { DEFAULT: "#1a1714", muted: "#6b6560", faint: "#c4bfb8" },
        page: { DEFAULT: "#faf8f4", dark: "#f2ede5", darker: "#e8e2d8" },
        violet: { DEFAULT: "#6d4fc2", light: "#ede8f8", dark: "#3a2878", mid: "#8b6dd6" },
        teal: { DEFAULT: "#1a9070", light: "#e0f4ed" },
        amber: { DEFAULT: "#c07818", light: "#fdf0d8" },
        coral: { DEFAULT: "#c44828", light: "#fdeee8" },
        streak: "#f56500",
      },
      animation: {
        "slide-up": "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        "fade-in": "fadeIn 0.3s ease",
        "bounce-in": "bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        "bar-fill": "barFill 0.8s cubic-bezier(0.4,0,0.2,1) forwards",
      },
      keyframes: {
        slideUp: { "0%": { transform: "translateY(100%)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        bounceIn: { "0%": { transform: "scale(0.3)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        barFill: { "0%": { width: "0%" }, "100%": { width: "var(--bar-width)" } },
      },
    },
  },
  plugins: [],
};
export default config;
