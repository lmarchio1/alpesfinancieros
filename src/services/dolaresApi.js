import { fetchArgBonds } from './data912Api'

const BASE_URL = 'https://dolarapi.com/v1'
const HIST_BASE_URL = 'https://api.argentinadatos.com/v1/cotizaciones'

const CASAS = ['oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta']

// MEP implícito via AL30/AL30D (bono en pesos vs. su variante en dólares, 48hs):
// contrastado contra el cierre de referencia de Ámbito Financiero, coincidió
// exacto ($1.535,08 los dos), mientras que dolarapi.com venía mostrando un
// valor con diferencias de hasta $20. Compra = vender el bono en pesos y
// comprarlo en dólares (AL30 bid / AL30D ask); venta = al revés (AL30 ask /
// AL30D bid) — mismo criterio bid/ask que usa el resto del sitio.
async function fetchDolarMepImplicito() {
  try {
    const bonds = await fetchArgBonds()
    const porSimbolo = new Map(bonds.map((b) => [b.symbol, b]))
    const al30 = porSimbolo.get('AL30')
    const al30d = porSimbolo.get('AL30D')
    if (!al30?.px_bid || !al30?.px_ask || !al30d?.px_bid || !al30d?.px_ask) return null
    return {
      compra: al30.px_bid / al30d.px_ask,
      venta: al30.px_ask / al30d.px_bid,
    }
  } catch {
    return null
  }
}

export async function fetchDolares() {
  const [res, mep] = await Promise.all([fetch(`${BASE_URL}/dolares`), fetchDolarMepImplicito()])
  if (!res.ok) throw new Error('No se pudo obtener la cotización del dólar')
  const data = await res.json()

  if (!mep) return data
  return data.map((d) => (d.casa === 'bolsa' ? { ...d, compra: mep.compra, venta: mep.venta } : d))
}

function dateParts(date) {
  return {
    yyyy: date.getFullYear(),
    mm: String(date.getMonth() + 1).padStart(2, '0'),
    dd: String(date.getDate()).padStart(2, '0'),
  }
}

async function fetchCasaOnDate(casa, date) {
  const { yyyy, mm, dd } = dateParts(date)
  const res = await fetch(`${HIST_BASE_URL}/dolares/${casa}/${yyyy}/${mm}/${dd}`)
  if (!res.ok) return null
  return res.json()
}

// Busca hacia atrás hasta encontrar el último día hábil con cotización (por si el día
// anterior fue feriado o todavía no está cargado).
async function fetchCasaPreviousClose(casa, fromDate, maxDaysBack = 6) {
  for (let i = 1; i <= maxDaysBack; i++) {
    const d = new Date(fromDate)
    d.setDate(d.getDate() - i)
    const data = await fetchCasaOnDate(casa, d)
    if (data) return data
  }
  return null
}

// Cotización de cierre del día hábil anterior, por casa, para comparar contra el precio en vivo.
export async function fetchDolaresAyer() {
  const now = new Date()
  const entries = await Promise.all(
    CASAS.map(async (casa) => [casa, await fetchCasaPreviousClose(casa, now)])
  )
  return Object.fromEntries(entries)
}
