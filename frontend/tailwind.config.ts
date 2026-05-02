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
          panel: "#080d16",
          panel2: "#0b1320",
          line: "#182235",
          purple: "#7a35ff",
          violet: "#4f1fc7",
          green: "#21f26b",
          cyan: "#28d7ff",
          gold: "#f4c542",
          red: "#ff4f70"
        }
      },
      boxShadow: {
        glow: "0 0 32px rgba(122, 53, 255, 0.28)",
        green: "0 0 26px rgba(33, 242, 107, 0.24)",
        card: "0 16px 40px rgba(0, 0, 0, 0.32)"
      },
      backgroundImage: {
        "vault-radial": "radial-gradient(circle at top left, rgba(122,53,255,.20), transparent 30%), radial-gradient(circle at 80% 20%, rgba(33,242,107,.14), transparent 26%), linear-gradient(180deg, #05070f 0%, #070b13 55%, #05070f 100%)"
      }
    }
  },
  plugins: []
};

export default config;

