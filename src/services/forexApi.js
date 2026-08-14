const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api'

const MONEDAS = ['EUR', 'GBP', 'BRL', 'CLP', 'COP']

async function fetchUsdRates(fecha) {
  const res = await fetch(`${BASE_URL}@${fecha}/v1/currencies/usd.json`)
  if (!res.ok) throw new Error('No se pudieron obtener las cotizaciones')
  return res.json()
}

function diaAnterior(fechaIso) {
  const d = new Date(`${fechaIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function fetchOtrasMonedas() {
  const hoy = await fetchUsdRates('latest')

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
      variacionPct: usdPorUnidadAyer ? ((usdPorUnidad - usdPorUnidadAyer) / usdPorUnidadAyer) * 100 : null,
    }
  })

  return { cotizaciones, fecha: hoy.date }
}
