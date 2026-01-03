import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        serif: ["var(--font-serif)", "Crimson Text", "serif"],
        display: ["var(--font-display)", "Pirata One", "cursive"],
      },
      colors: {
        parchment: {
          100: "var(--p-100)",
          200: "var(--p-200)",
          300: "var(--p-300)",
          400: "var(--p-400)",
          500: "#e0ccab",
          600: "#d4bc94",
          700: "#c7ab7d",
          800: "var(--p-800)",
          900: "var(--p-900)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          light: "var(--ink-light)",
          faint: "var(--ink-faint)",
        },
        "btn-text": "var(--btn-text)",
        gold: {
          DEFAULT: "var(--gold)",
          dim: "var(--gold-dim)",
          light: "#e6c885",
        },
        burgundy: {
          DEFAULT: "var(--burgundy)",
          dim: "var(--burgundy-dim)",
        },
        forest: {
          DEFAULT: "var(--forest)",
          dim: "var(--forest-dim)",
        },
      },
      boxShadow: {
        ink: "0 1px 2px rgba(var(--shadow-color), 0.3)",
        pressed: "inset 0 2px 4px rgba(0,0,0,0.3)",
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease-out",
        "scroll-up": "scroll-up 60s linear infinite",
        "scroll-down": "scroll-down 60s linear infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scroll-up": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
        "scroll-down": {
          "0%": { transform: "translateY(-50%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
