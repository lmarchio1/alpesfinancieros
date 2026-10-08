import { useEffect, useState } from 'react'

// true en pantallas de celular (menos de 640px, el corte "sm" de Tailwind). Lo usan los
// gráficos que se dibujan distinto en el teléfono: no alcanza con achicar el mismo SVG,
// porque escala todo por igual y la letra termina ilegible.
export function useEsMovil() {
  const consulta = '(max-width: 639px)'
  const [esMovil, setEsMovil] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(consulta).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const revisar = () => setEsMovil(mq.matches)
    revisar()
    // Se escuchan los dos: el evento de la media query es el correcto, pero hay
    // navegadores -y entornos de prueba- donde el cambio de ancho no lo dispara.
    mq.addEventListener('change', revisar)
    window.addEventListener('resize', revisar)
    return () => {
      mq.removeEventListener('change', revisar)
      window.removeEventListener('resize', revisar)
    }
  }, [])
  return esMovil
}
