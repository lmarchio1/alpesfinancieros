/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#b3ccff',
          300: '#80a9ff',
          400: '#4d7fff',
          500: '#2559f5',
          600: '#1a41c9',
          700: '#17369e',
          800: '#152f7d',
          900: '#0f1f52',
          950: '#0a1436',
        },
        // Colores exactos del isologo provisto (montaña + toro).
        alpesNavy: '#123a5c',
        alpesBronze: '#7a6a58',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'spin-slow': 'spin-slow 80s linear infinite',
      },
    },
  },
  plugins: [],
}
