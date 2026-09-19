const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api'

const MONEDAS = ['EUR', 'GBP', 'BRL', 'CLP', 'COP', 'UYU']
// La misma API expone metales preciosos como si fueran "monedas" (XAU =
// onza de oro, etc.), así que se resuelven con el mismo fetch de usd.json,
// sin ningún llamado ni dependencia extra.
const METALES = ['XAU', 'XAG', 'XPT']

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudieron obtener las cotizaciones')
  return res.json()
}

// @latest resuelve a la publicación más nueva -confirmado en vivo-, pero
// jsdelivr la sirve desde su CDN de borde con Cache-Control: s-maxage=43200
// (12hs) e IGNORA POR COMPLETO el query string para decidir qué devolver
// -confirmado pidiendo la misma URL con dos cache-busters distintos: llegó
// el mismo header Age en los dos, o sea la misma respuesta cacheada-. Ningún
// truco de cache-busting del lado del cliente puede evitar ese caché de
// borde, así que @latest no sirve como fuente primaria para "hoy".
//
// En cambio, la URL con fecha exacta (@YYYY-MM-DD) apunta a una versión
// específica e inmutable del paquete, que jsdelivr cachea de forma estable
// y correcta una vez publicada. Por eso ahora se pide esa primero, y solo
// se cae a @latest si la fecha de hoy todavía no se publicó (404).
function fetchUsdRatesFecha(fecha) {
  return fetchJson(`${BASE_URL}@${fecha}/v1/currencies/usd.json`)
}

function fetchUsdRatesLatest(cacheBuster) {
  return fetchJson(`${BASE_URL}@latest/v1/currencies/usd.json?_=${cacheBuster}`)
}

function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

async function fetchUsdRatesHoy() {
  try {
    return await fetchUsdRatesFecha(fechaArgentinaHoy())
  } catch {
    return fetchUsdRatesLatest(Date.now())
  }
}

function diaAnterior(fechaIso) {
  const d = new Date(`${fechaIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// La fuente no siempre publica todas las monedas: el 18/09/2026 el archivo del día
// salió con 301 claves en vez de 340 y le faltaban, entre otras, el platino (XPT) y el
// paladio. Con `1 / undefined` eso daba NaN y la tarjeta mostraba "USD NaN", así que
// cada cotización se valida acá: si la fuente no la publicó, se devuelve null y la
// tarjeta no se dibuja, sin afectar al resto.
function tasa(rates, codigo) {
  const valor = rates?.[codigo.toLowerCase()]
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : null
}

export async function fetchOtrasMonedas() {
  const hoy = await fetchUsdRatesHoy()

  let ayer = null
  try {
    ayer = await fetchUsdRatesFecha(diaAnterior(hoy.date))
  } catch {
    ayer = null
  }

  // Sin el peso no hay nada que mostrar: se trata como una respuesta inservible, así el
  // hook conserva el último dato bueno en vez de reemplazarlo por tarjetas vacías.
  const arsPorUsd = tasa(hoy.usd, 'ars')
  if (!arsPorUsd) throw new Error('No se pudieron obtener las cotizaciones')

  const cotizaciones = MONEDAS.map((codigo) => {
    const porUsd = tasa(hoy.usd, codigo)
    if (!porUsd) return null
    const porUsdAyer = tasa(ayer?.usd, codigo)
    const usdPorUnidad = 1 / porUsd
    const usdPorUnidadAyer = porUsdAyer ? 1 / porUsdAyer : null

    return {
      codigo,
      usd: usdPorUnidad,
      ars: usdPorUnidad * arsPorUsd,
      porUsd,
      // Variación de la moneda contra el dólar (ej. cuánto se movió el EUR).
      variacionPct: usdPorUnidadAyer ? ((usdPorUnidad - usdPorUnidadAyer) / usdPorUnidadAyer) * 100 : null,
      // Variación inversa (cuánto se movió el USD medido en esa moneda): no es
      // simplemente el signo opuesto de variacionPct, es la variación propia
      // de porUsd, para que la vista "US$ → Moneda" muestre el signo correcto.
      variacionPctInverso: porUsdAyer ? ((porUsd - porUsdAyer) / porUsdAyer) * 100 : null,
    }
  }).filter(Boolean)

  const metales = METALES.map((codigo) => {
    const porOnza = tasa(hoy.usd, codigo)
    if (!porOnza) return null
    const porOnzaAyer = tasa(ayer?.usd, codigo)
    const usdPorOnza = 1 / porOnza
    const usdPorOnzaAyer = porOnzaAyer ? 1 / porOnzaAyer : null

    return {
      codigo,
      usd: usdPorOnza,
      ars: usdPorOnza * arsPorUsd,
      variacionPct: usdPorOnzaAyer ? ((usdPorOnza - usdPorOnzaAyer) / usdPorOnzaAyer) * 100 : null,
    }
  }).filter(Boolean)

  if (cotizaciones.length === 0 && metales.length === 0) {
    throw new Error('No se pudieron obtener las cotizaciones')
  }

  return { cotizaciones, metales, fecha: hoy.date }
}
