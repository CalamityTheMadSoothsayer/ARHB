/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf8f0',
          100: '#f9edda',
          200: '#f2d9b0',
          300: '#e8c07e',
          400: '#d9a24d',
          500: '#c4872a',
          600: '#a06c1e',
          700: '#7d5218',
          800: '#5e3d14',
          900: '#3d2809',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
