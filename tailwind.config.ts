// tailwind.config.js
// manages the styling

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
      },
      backgroundImage: {
        'geometric-circle': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
      },
      gradientColorStops: {
        from: '#ff3131',
        to: 'rgba(3, 174, 210, 0)',
      },
    },
  },
  plugins: [
    require('tailwindcss-bg-patterns'), 
  ],
};

export default config;