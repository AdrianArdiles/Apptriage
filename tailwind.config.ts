import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          primary: "#475569",
          secondary: "#334155",
          "slate-blue": "#5b6b84",
          "sky-blue": "#7dd3fc",
          "sky-light": "#e0f2fe",
          white: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      keyframes: {
        "timestamp-in": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "button-flash": {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(37, 99, 235, 0)" },
          "50%": { transform: "scale(0.96)", boxShadow: "0 0 0 6px rgba(37, 99, 235, 0.5)" },
        },
        "critical-blink": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(220, 38, 38, 0)" },
          "50%": { opacity: "0.92", boxShadow: "0 0 20px 4px rgba(220, 38, 38, 0.4)" },
        },
      },
      animation: {
        "timestamp-in": "timestamp-in 0.25s ease-out forwards",
        "button-flash": "button-flash 0.4s ease-out",
        "critical-blink": "critical-blink 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
