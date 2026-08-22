const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api'

const MONEDAS = ['EUR', 'GBP', 'BRL', 'CLP', 'COP']

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

export async function fetchOtrasMonedas() {
  const hoy = await fetchUsdRatesHoy()

  let ayer = null
  try {
    ayer = await fetchUsdRatesFecha(diaAnterior(hoy.date))
  } catch {
    ayer = null
  }

  const arsPorUsd = hoy.usd.ars
  const cotizaciones = MONEDAS.map((codigo) => {
    const clave = codigo.toLowerCase()
    const usdPorUnidad = 1 / hoy.usd[clave]
    const usdPorUnidadAyer = ayer?.usd?.[clave] ? 1 / ayer.usd[clave] : null

    return {
      codigo,
      usd: usdPorUnidad,
      ars: usdPorUnidad * arsPorUsd,
      porUsd: hoy.usd[clave],
      variacionPct: usdPorUnidadAyer ? ((usdPorUnidad - usdPorUnidadAyer) / usdPorUnidadAyer) * 100 : null,
    }
  })

  return { cotizaciones, fecha: hoy.date }
}
