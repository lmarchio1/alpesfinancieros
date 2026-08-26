/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Escala tonal derivada del navy real del isologo (alpesNavy = brand-600),
        // en vez de un azul genérico de sistema.
        brand: {
          50: '#f2f8fc',
          100: '#ddecf8',
          200: '#b2d3f0',
          300: '#77b1e4',
          400: '#338ad7',
          500: '#2065a2',
          600: '#123a5c',
          700: '#0d2b44',
          800: '#0a2033',
          900: '#071522',
          950: '#040d15',
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
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0)' },
          '60%': { opacity: '1', transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'spin-slow': 'spin-slow 80s linear infinite',
        // "backwards" (no "both"): mantiene oculto durante el animation-delay
        // del stagger, pero al terminar suelta la propiedad transform en vez
        // de dejarla "trabada" en su valor final -si quedara trabada, le
        // gana al transform que debería aplicar el :hover (levantar +
        // agrandar) en cualquier tarjeta que tenga la animación de entrada
        // en el mismo elemento que el hover.
        'fade-up': 'fade-up 0.8s ease-out backwards',
        pop: 'pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
      },
    },
  },
  plugins: [],
}
