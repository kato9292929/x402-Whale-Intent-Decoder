import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          dark: "#040d1a",
          card: "#1a3a5c",
          accent: "#00d4ff",
          alert: "#ff4444",
        },
      },
      fontFamily: {
        mono: ["Space Mono", "monospace"],
        header: ["Bebas Neue", "sans-serif"],
      },
      animation: {
        "sonar-1": "sonar 3s ease-out infinite",
        "sonar-2": "sonar 3s ease-out infinite 1s",
        "sonar-3": "sonar 3s ease-out infinite 2s",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "fade-in-1": "fadeIn 0.5s ease-out 0.1s forwards",
        "fade-in-2": "fadeIn 0.5s ease-out 0.2s forwards",
        "fade-in-3": "fadeIn 0.5s ease-out 0.3s forwards",
        "fade-in-4": "fadeIn 0.5s ease-out 0.4s forwards",
        "fade-in-5": "fadeIn 0.5s ease-out 0.5s forwards",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        sonar: {
          "0%": { transform: "scale(0.5)", opacity: "0.8" },
          "100%": { transform: "scale(3)", opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
