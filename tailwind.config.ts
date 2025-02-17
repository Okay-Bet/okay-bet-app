// tailwind.config.js
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        header: ["'Bebas Neue'", "sans-serif"],
        heading: ["'Monument'", "sans-serif"],
        body: ["'Montserrat'", "sans-serif"],
      },
      colors: {
        primary: "#000000",
        secondary: "#ff3131",
        tertiary: "#DC5F00",
        quaternary: "#EEEEEE",
        font: "#EEEEEE",
        demo: "#F4E0B9",
        // Adding complementary colors
        "accent-red": {
          100: "#FFE5E5",
          200: "#FFB8B8",
          300: "#FF8A8A",
          400: "#FF5C5C",
          500: "#ff3131",
          600: "#CC2727",
          700: "#991D1D",
          800: "#661414",
          900: "#330A0A",
        },
        "accent-gray": {
          100: "#F7F7F7",
          200: "#E6E6E6",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#DC2626",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
        "sharp-blue": "#0052FF",
        "electric-cyan": "#00F0FF",
        "neon-pink": "#FF2D55",
      },
      backgroundImage: {
        "geometric-circle":
          "radial-gradient(circle at center, var(--tw-gradient-stops))",
        "gradient-sharp": "linear-gradient(135deg, var(--tw-gradient-stops))",
        "gradient-aggressive":
          "linear-gradient(45deg, var(--tw-gradient-stops))",
        "gradient-glow":
          "radial-gradient(circle at top right, var(--tw-gradient-stops))",
        "gradient-harsh": "linear-gradient(90deg, var(--tw-gradient-stops))",
        'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
        'subtle-white': 'linear-gradient(to bottom right, white, rgb(249 250 251))',
        "gradient-angular":
          "conic-gradient(from 0deg, var(--tw-gradient-stops))",
      },
      boxShadow: {
        sharp: "0 4px 0 0 rgba(0, 0, 0, 0.25)",
        neon: "0 0 15px rgba(255, 49, 49, 0.5)",
        "inner-sharp": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.25)",
        aggressive: "8px 8px 0 0 #000000",
      },
      animation: {
        "gradient-shift": "gradient-shift 10s ease infinite",
        "pulse-sharp": "pulse-sharp 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        glow: "glow 1.5s ease-in-out infinite alternate",
      },
      blur: {
        '3xl': '64px',
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center",
          },
        },
        "pulse-sharp": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".7" },
        },
        glow: {
          from: { boxShadow: "0 0 5px rgba(255, 49, 49, 0.5)" },
          to: { boxShadow: "0 0 20px rgba(255, 49, 49, 0.8)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-bg-patterns")],
};

export default config;
