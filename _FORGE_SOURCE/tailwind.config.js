/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'forge-ember': '#ff4d00',
        'forge-steel': '#1a1a1a',
        'forge-iron': '#2d2d2d',
      },
    },
  },
  plugins: [],
}