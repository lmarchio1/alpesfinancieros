import { fetchArgNotes } from './data912Api'

const BASE_URL = 'https://api.argentinadatos.com/v1/finanzas'

async function getJson(path) {
  const res = await fetch(`${BASE_URL}/${path}`)
  if (!res.ok) throw new Error('No se pudo obtener la información de renta fija')
  return res.json()
}

function noVencido(instrumento) {
  return new Date(instrumento.fechaVencimiento) > new Date()
}

export async function fetchRentaFija() {
  const [bonosResp, letrasMeta, riesgoPais, notas] = await Promise.all([
    getJson('bonos-cer'),
    getJson('letras'),
    getJson('indices/riesgo-pais/ultimo'),
    fetchArgNotes(),
  ])

  const bonos = bonosResp.bonos
    .filter(noVencido)
    .sort((a, b) => b.volumen - a.volumen)
    .slice(0, 6)

  const precioPorTicker = new Map(notas.map((n) => [n.symbol, n.c]))

  const letrasOrdenadas = letrasMeta
    .filter(noVencido)
    .map((l) => ({
      ...l,
      precioActual: precioPorTicker.get(l.ticker),
      variacionPorcentaje: notas.find((n) => n.symbol === l.ticker)?.pct_change,
    }))
    // solo letras con precio de mercado en vivo: sin eso no hay retorno calculable
    .filter((l) => typeof l.precioActual === 'number' && l.precioActual > 0)
    .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))
    .slice(0, 6)

  return { bonos, letras: letrasOrdenadas, riesgoPais }
}

// Valor de riesgo país del día hábil anterior, para comparar contra el último dato.
// Este endpoint no tiene una versión liviana por fecha: trae toda la serie histórica,
// así que solo conviene pedirlo una vez (no en cada poll).
export async function fetchRiesgoPaisAnterior() {
  const historico = await getJson('indices/riesgo-pais')
  if (!Array.isArray(historico) || historico.length < 2) return null
  return historico[historico.length - 2]
}
