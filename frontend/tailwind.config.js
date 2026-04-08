/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        genesis: {
          50:  '#f0f4ff',
          500: '#4f6ef7',
          900: '#1a1f3c'
        }
      }
    }
  },
  plugins: []
}
