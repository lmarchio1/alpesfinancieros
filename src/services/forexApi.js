const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api'

const MONEDAS = ['EUR', 'GBP', 'BRL', 'CLP', 'COP']

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudieron obtener las cotizaciones')
  return res.json()
}

// @latest siempre resuelve a la publicación más nueva disponible -confirmado
// en vivo-, pero el navegador la cachea 7 días (Cache-Control: max-age=604800)
// sin importar que el contenido cambie a diario. La query con la fecha de hoy
// cambia una vez por día y fuerza al navegador a volver a pedirla.
// (La alternativa de pedir la fecha exacta en la URL, @YYYY-MM-DD, evita ese
// cache pero puede tardar horas en propagarse recién empezado el día -esa
// ruta quedaba en 404 mientras @latest ya tenía el dato nuevo-, así que
// @latest + cache-busting es la fuente primaria para "hoy".)
function fetchUsdRatesLatest(fechaHoy) {
  return fetchJson(`${BASE_URL}@latest/v1/currencies/usd.json?_=${fechaHoy}`)
}

// Para "ayer" sí conviene la fecha exacta en la URL: es una fecha que ya pasó
// por completo, por lo que su publicación ya está estable y disponible.
function fetchUsdRatesFecha(fecha) {
  return fetchJson(`${BASE_URL}@${fecha}/v1/currencies/usd.json`)
}

function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

function diaAnterior(fechaIso) {
  const d = new Date(`${fechaIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function fetchOtrasMonedas() {
  const fechaHoy = fechaArgentinaHoy()
  const hoy = await fetchUsdRatesLatest(fechaHoy)

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
