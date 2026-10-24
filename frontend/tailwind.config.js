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
        canvas: '#FAF8F5',         // Soft warm stone canvas
        canvasSubtle: '#F4F1EA',   // Muted stone canvas accent
        card: '#FFFFFF',           // Crisp white card surface
        surfaceSubtle: '#F7F5F0',  // Warm ivory surface tint
        borderSubtle: '#E5E2DC',   // Delicate hairline border
        borderFocus: '#D4D0C7',    // Refined active border
        brand: {
          emerald: '#065F46',      // British racing green / deep pine
          emeraldDark: '#044E39',
          emeraldLight: '#ECFDF5',
          amber: '#D97706',        // Burnished amber / warm copper
          amberLight: '#FFFBEB',
          navy: '#0F172A',
          charcoal: '#18181B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Newsreader', 'Fraunces', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.03), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 8px 24px -4px rgba(0, 0, 0, 0.05)',
        'float': '0 12px 36px -8px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [],
}

