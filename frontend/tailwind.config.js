/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#14141e',
        'surface-hover': '#1e1e2e',
        border: '#252535',
        text: '#e8e8f0',
        muted: '#6b6b80',
        accent: '#7c6af7',
        'accent-glow': 'rgba(124, 106, 247, 0.15)',
        'accent-dim': '#3d3580',
        green: '#4ade80',
        'green-dim': 'rgba(74, 222, 128, 0.15)',
        red: '#f87171',
        'red-dim': 'rgba(248, 113, 113, 0.15)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}