/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:     '#06080e',
        bg2:    '#0c0f1a',
        bg3:    '#111828',
        bg4:    '#1a2236',
        gold:   '#d4a843',
        gold2:  '#f0c96a',
        border: 'rgba(255,255,255,0.07)',
      },
      fontFamily: {
        sans:    ['var(--font-sans)'],
        mono:    ['var(--font-mono)'],
        display: ['var(--font-display)'],
      },
    },
  },
  plugins: [],
}
