import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          ink: "#05070f",
          panel: "#071017",
          panel2: "#0a1620",
          line: "#18313a",
          purple: "#15cfe0",
          violet: "#0b8da5",
          green: "#baff00",
          cyan: "#16d7d2",
          gold: "#f4c542",
          red: "#ff4f70"
        }
      },
      boxShadow: {
        glow: "0 0 32px rgba(22, 215, 210, 0.26)",
        green: "0 0 26px rgba(186, 255, 0, 0.22)",
        card: "0 16px 40px rgba(0, 0, 0, 0.32)"
      },
      backgroundImage: {
        "vault-radial": "radial-gradient(circle at top left, rgba(22,215,210,.18), transparent 30%), radial-gradient(circle at 80% 20%, rgba(186,255,0,.12), transparent 26%), linear-gradient(180deg, #05070f 0%, #071017 55%, #05070f 100%)"
      }
    }
  },
  plugins: []
};

export default config;
