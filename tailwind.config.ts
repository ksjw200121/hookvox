/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f0',
          100: '#ffe0de',
          200: '#ffc7c3',
          300: '#ffa099',
          400: '#ff6b61',
          500: '#ff3d30',
          600: '#ed1f11',
          700: '#c8150a',
          800: '#a5160d',
          900: '#881912',
          950: '#4b0804',
        },
        dark: {
          900: '#0a0a0b',
          800: '#111113',
          700: '#1a1a1e',
          600: '#222228',
          500: '#2d2d35',
          400: '#3a3a45',
        }
      },
      fontFamily: {
        sans: ['var(--font-noto)', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
