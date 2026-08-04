import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        text: "var(--text)",
        muted: "var(--muted)",
        line: "var(--line)",
        ink: "var(--ink)",
        "ink-contrast": "var(--ink-contrast)",
        pro: "var(--red)",
        carb: "var(--amber)",
        fat: "var(--blue)",
      },
      borderRadius: {
        card: "var(--r-card)",
        pill: "var(--r-pill)",
      },
      boxShadow: {
        soft: "var(--shadow)",
        nav: "var(--shadow-nav)",
      },
    },
  },
  plugins: [],
};

export default config;
