// La URL "@latest" del CDN tiene cache-control de 7 días (max-age=604800): el
// navegador la sirve stale durante toda esa ventana aunque el contenido cambie
// a diario. Pedimos la fecha exacta en la URL (cambia todos los días, rompe el
// cache) y si el día de hoy todavía no está publicado, caemos a ayer.
const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api'

const MONEDAS = ['EUR', 'GBP', 'BRL', 'CLP', 'COP']

async function fetchUsdRates(fecha) {
  const res = await fetch(`${BASE_URL}@${fecha}/v1/currencies/usd.json`)
  if (!res.ok) throw new Error('No se pudieron obtener las cotizaciones')
  return res.json()
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
  let hoy
  try {
    hoy = await fetchUsdRates(fechaHoy)
  } catch {
    hoy = await fetchUsdRates(diaAnterior(fechaHoy))
  }

  let ayer = null
  try {
    ayer = await fetchUsdRates(diaAnterior(hoy.date))
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
