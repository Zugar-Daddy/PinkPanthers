/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Neo-Brutalist edvr.vercel.app palette
        canvas: '#FDFBF7',         // Warm off-white / ivory canvas
        neoBlack: '#09090B',       // Deep ink black
        neoCard: '#FFFFFF',        // Pure white card surfaces
        neoMint: '#A7F3D0',        // Pastel mint green
        neoMintDark: '#059669',
        neoYellow: '#FEF08A',      // Sunflower pastel yellow
        neoYellowDark: '#CA8A04',
        neoSky: '#BAE6FD',         // Pastel sky blue
        neoSkyDark: '#0284C7',
        neoPurple: '#DDD6FE',      // Pastel lavender purple
        neoPurpleDark: '#7C3AED',
        neoRose: '#FECDD3',        // Pastel rose
        neoRed: '#E11D48',         // EdVR signature crimson red
        neoCrimson: '#BE123C',
        neoOrange: '#FED7AA',      // Pastel peach orange
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['system-ui', '-apple-system', 'sans-serif'],
      },
      borderWidth: {
        '3': '3px',
      },
      boxShadow: {
        'brutal': '4px 4px 0px #09090B',
        'brutal-sm': '2px 2px 0px #09090B',
        'brutal-lg': '6px 6px 0px #09090B',
        'brutal-xl': '8px 8px 0px #09090B',
        'brutal-red': '4px 4px 0px #E11D48',
        'brutal-mint': '4px 4px 0px #059669',
        'brutal-yellow': '4px 4px 0px #CA8A04',
      }
    },
  },
  plugins: [],
}
