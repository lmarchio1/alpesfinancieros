import { fetchArgNotes } from './data912Api'
import { obtenerAperturaDiaria } from '../utils/aperturaDiaria'

const BASE_URL = 'https://api.argentinadatos.com/v1/finanzas'
const RIESGO_ANTERIOR_KEY = 'alpes_riesgo_pais_anterior'
const APERTURA_KEY = 'alpes_apertura_mercado'

function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

// La URL "pelada" de esta API la pide tantísima gente que el cache de Cloudflare
// la sirve stale por más tiempo del que indica su propio Cache-Control: max-age=60
// (verificado: la app se quedaba pegada un día entero en el valor de riesgo país).
// Un parámetro único por pedido evita pegarle a esa entrada de cache compartida.
async function getJson(path) {
  const url = `${BASE_URL}/${path}?_=${Date.now()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudo obtener la información de renta fija')
  return res.json()
}

function noVencido(instrumento) {
  return new Date(instrumento.fechaVencimiento) > new Date()
}

export async function fetchRentaFija() {
  const [letrasMeta, riesgoPais, notas] = await Promise.all([
    getJson('letras'),
    getJson('indices/riesgo-pais/ultimo'),
    fetchArgNotes(),
  ])

  const precioPorTicker = new Map(notas.map((n) => [n.symbol, n.c]))
  const pctChangePorTicker = new Map(notas.map((n) => [n.symbol, n.pct_change]))

  // data912 no da timestamp por especie y sigue devolviendo el % de la rueda anterior
  // toda la madrugada, hasta que el mercado vuelve a operar. Se recalcula la variación
  // contra el primer precio visto hoy en este navegador (ver obtenerAperturaDiaria) en
  // vez de confiar en ese %: pasada la medianoche da 0% y solo vuelve a moverse cuando
  // el precio efectivamente cambia. Comparte la clave de localStorage con los bonos
  // (bondsLiveApi.js) porque los tickers no se pisan entre sí.
  const aperturas = obtenerAperturaDiaria(APERTURA_KEY, precioPorTicker)

  const letrasOrdenadas = letrasMeta
    .filter(noVencido)
    .map((l) => {
      const precioActual = precioPorTicker.get(l.ticker)
      const apertura = aperturas[l.ticker]
      return {
        ...l,
        precioActual,
        variacionPorcentaje:
          apertura > 0 && typeof precioActual === 'number'
            ? ((precioActual - apertura) / apertura) * 100
            : pctChangePorTicker.get(l.ticker),
      }
    })
    // solo letras con precio de mercado en vivo: sin eso no hay retorno calculable
    .filter((l) => typeof l.precioActual === 'number' && l.precioActual > 0)
    .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))
    .slice(0, 6)

  return { letras: letrasOrdenadas, riesgoPais }
}

// Valor de riesgo país del día hábil anterior, para comparar contra el último dato.
// Este endpoint no tiene una versión liviana por fecha: trae toda la serie histórica
// completa (~7.700 registros desde 1999, ~400KB) sin importar los parámetros que se le
// manden. Como además se le suma un cache-buster a propósito (ver comentario de
// getJson), se estaba volviendo a descargar entera cada vez que se abría la pestaña de
// Renta Fija, no solo la primera vez. Se guarda en localStorage y se pide una sola vez
// por día -el valor de "ayer" no cambia en lo que dura el día de hoy-.
export async function fetchRiesgoPaisAnterior() {
  const hoy = fechaArgentinaHoy()
  try {
    const cache = JSON.parse(localStorage.getItem(RIESGO_ANTERIOR_KEY) || '{}')
    if (cache.fecha === hoy && cache.valor) return cache.valor
  } catch {
    // localStorage puede no estar disponible, o el valor guardado puede ser inválido.
  }

  const historico = await getJson('indices/riesgo-pais')
  if (!Array.isArray(historico) || historico.length < 2) return null
  const anterior = historico[historico.length - 2]

  try {
    localStorage.setItem(RIESGO_ANTERIOR_KEY, JSON.stringify({ fecha: hoy, valor: anterior }))
  } catch {
    // localStorage puede no estar disponible (modo privado, cuota llena).
  }

  return anterior
}
