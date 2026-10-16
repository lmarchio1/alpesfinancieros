import { fetchPreciosCache } from './supabaseClient'
import { cambiosDeRango, parsearTasasFed, restarDiasFed, urlTasaFedEntre, urlUltimaTasaFed } from '../utils/fed'

// Tasa de la Reserva Federal para la tarjeta de Tasas EEUU.
//
// El dato del día se le pide directo a la Fed de Nueva York (es un JSON de menos de 1 KB,
// oficial y sin clave): así, después de una reunión, el rango nuevo aparece apenas se
// publica, sin esperar a la tarea nocturna. La lista de cambios de rango sale de la fila
// que guarda esa tarea (ver scripts/cachear-fed.mjs). Si alguna de las dos no responde,
// se usa la otra.

const UNA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000
const ESPERA_MAXIMA_MS = 8000

async function pedirJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ESPERA_MAXIMA_MS) })
  if (!res.ok) throw new Error('No se pudo obtener la tasa de la Fed')
  return res.json()
}

// Sin la fila guardada, los cambios se arman con el último año y poco de la API (~80 KB).
// Alcanza para encontrar el último cambio salvo que la Fed lleve más de un año quieta; en
// ese caso la tarjeta simplemente no lo muestra.
async function cambiosDesdeLaFed() {
  const hoy = new Date().toISOString().slice(0, 10)
  return cambiosDeRango(parsearTasasFed(await pedirJson(urlTasaFedEntre(restarDiasFed(hoy, 400), hoy))))
}

// Último cambio de rango (fecha desde la que rige y cuántos pb se movió el techo).
function ultimoCambio(actual, cambios) {
  const vigente = cambios.at(-1)
  if (!vigente) return null
  // La API ya muestra un rango que la fila guardada todavía no tiene: cambió en estos días.
  if (vigente.desde !== actual.desde || vigente.hasta !== actual.hasta) {
    return { fecha: actual.fecha, pb: Math.round((actual.hasta - vigente.hasta) * 100), reciente: true }
  }
  const anterior = cambios.at(-2)
  return anterior ? { fecha: vigente.fecha, pb: Math.round((vigente.hasta - anterior.hasta) * 100) } : null
}

export async function fetchTasaFed() {
  const [directo, guardado] = await Promise.allSettled([pedirJson(urlUltimaTasaFed()), fetchPreciosCache('fed_tasa', UNA_SEMANA_MS)])
  const delDia = directo.status === 'fulfilled' ? parsearTasasFed(directo.value).at(-1) : null
  const resumen = guardado.status === 'fulfilled' ? guardado.value : null

  const actual = delDia ?? resumen?.ultimo
  if (!actual) throw new Error('No se pudo obtener la tasa de la Fed')

  let cambios = Array.isArray(resumen?.cambios) ? resumen.cambios : null
  if (!cambios) {
    try {
      cambios = await cambiosDesdeLaFed()
    } catch {
      cambios = []
    }
  }

  return { ...actual, ultimoCambio: ultimoCambio(actual, cambios) }
}

// Historia de la tasa efectiva para el gráfico. Sin la fila guardada, se pide el último
// año directo a la Fed (~70 KB), y el gráfico avisa que es parcial.
export async function fetchHistoriaFed() {
  const cache = await fetchPreciosCache('fed_historia', UNA_SEMANA_MS)
  if (Array.isArray(cache?.puntos) && cache.puntos.length > 0) return { puntos: cache.puntos, completa: true }
  const hoy = new Date().toISOString().slice(0, 10)
  const dias = parsearTasasFed(await pedirJson(urlTasaFedEntre(restarDiasFed(hoy, 365), hoy)))
  if (dias.length < 2) throw new Error('No se pudo obtener la historia de la tasa de la Fed')
  return { puntos: dias.map((d) => ({ fecha: d.fecha, valor: d.efectiva })), completa: false }
}
