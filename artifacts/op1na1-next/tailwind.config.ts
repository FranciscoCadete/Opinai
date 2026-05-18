import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#00c49a",
        "accent-dark": "#008f70",
        accent2: "#4fa3f7",
        danger: "#f76f6f",
        warn: "#f7b84f",
        surface: "#111720",
        bg: "#0b0f14",
        muted: "#6b7d96",
      },
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
        display: ["'Fraunces'", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
