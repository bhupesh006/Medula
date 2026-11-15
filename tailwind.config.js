/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./modules/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aerospace: {
          900: '#060B14',
          800: '#0C1527',
          700: '#142340',
          600: '#1D325A',
          500: '#2A467C',
          accent: '#00D1FF',
          warning: '#FFB800',
          danger: '#FF3B30',
          success: '#34C759',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

