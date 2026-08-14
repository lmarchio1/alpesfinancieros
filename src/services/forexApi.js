const BASE_URL = 'https://open.er-api.com/v6/latest/USD'

const MONEDAS = ['EUR', 'GBP', 'BRL', 'CLP', 'COP']

export async function fetchOtrasMonedas() {
  const res = await fetch(BASE_URL)
  if (!res.ok) throw new Error('No se pudieron obtener las cotizaciones')
  const json = await res.json()
  if (json.result !== 'success') throw new Error('No se pudieron obtener las cotizaciones')

  const arsPorUsd = json.rates.ARS
  const cotizaciones = MONEDAS.map((codigo) => {
    const usdPorUnidad = 1 / json.rates[codigo]
    return {
      codigo,
      usd: usdPorUnidad,
      ars: usdPorUnidad * arsPorUsd,
    }
  })

  return { cotizaciones, actualizadoUtc: json.time_last_update_utc }
}
