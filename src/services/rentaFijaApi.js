import { fetchArgNotes } from './data912Api'
import { fetchCierresDeAyer } from './supabaseClient'

const BASE_URL = 'https://api.argentinadatos.com/v1/finanzas'

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

// argentinadatos cambió el formato de /letras sin aviso: antes devolvía el array de
// letras pelado y ahora lo envuelve en un objeto, { fechaActualizacion, letras: [...] }.
// Como el código llamaba .filter() directo sobre la respuesta, la pestaña entera de
// Renta Fija se cayó en producción con "letrasMeta.filter is not a function". Se aceptan
// las dos formas para que siga andando si vuelven a cambiarlo de vuelta.
function normalizarLetras(respuesta) {
  if (Array.isArray(respuesta)) return respuesta
  if (Array.isArray(respuesta?.letras)) return respuesta.letras
  return []
}

export async function fetchRentaFija(forzar = false) {
  const [letrasResp, riesgoPais, notas] = await Promise.all([
    getJson('letras'),
    getJson('indices/riesgo-pais/ultimo'),
    fetchArgNotes(forzar),
  ])
  const letrasMeta = normalizarLetras(letrasResp)

  const precioPorTicker = new Map(notas.map((n) => [n.symbol, n.c]))
  const pctChangePorTicker = new Map(notas.map((n) => [n.symbol, n.pct_change]))

  // data912 no da timestamp por especie y sigue devolviendo el % de la rueda anterior
  // toda la madrugada, hasta que el mercado vuelve a operar. El cierre de ayer
  // (capturado a las 00hs, ver cierre-diario.yml) se usa solo como testigo: mientras
  // el precio en vivo sea igual a ese cierre, se muestra 0%; en cuanto se mueva, se
  // confía en el pct_change que da data912 tal cual.
  const cierres = await fetchCierresDeAyer([...precioPorTicker.keys()])
  const variacionDeHoy = (ticker, precioActual) => {
    const cierre = cierres[ticker]
    const sinMovimiento =
      typeof cierre === 'number' && typeof precioActual === 'number' && Math.abs(precioActual - cierre) < 0.005
    return sinMovimiento ? 0 : pctChangePorTicker.get(ticker)
  }

  const letrasOrdenadas = letrasMeta
    .filter(noVencido)
    .map((l) => {
      const precioActual = precioPorTicker.get(l.ticker)
      return { ...l, precioActual, variacionPorcentaje: variacionDeHoy(l.ticker, precioActual) }
    })
    // solo letras con precio de mercado en vivo: sin eso no hay retorno calculable
    .filter((l) => typeof l.precioActual === 'number' && l.precioActual > 0)
    .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))
    .slice(0, 6)

  return { letras: letrasOrdenadas, riesgoPais }
}

// Valor de riesgo país del cierre de ayer (capturado a las 00hs, ver
// cierre-diario.yml), para comparar contra el último dato. Reemplaza el cache en
// localStorage: antes, el primer visitante del día pagaba la descarga de la serie
// histórica completa (~7.700 registros, ~400KB) para calcularlo; ahora es una sola
// lectura rápida a Supabase, igual para todos.
export async function fetchRiesgoPaisAnterior() {
  const cierres = await fetchCierresDeAyer(['riesgo_pais'])
  return typeof cierres.riesgo_pais === 'number' ? { valor: cierres.riesgo_pais } : null
}
