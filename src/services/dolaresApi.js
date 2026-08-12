const BASE_URL = 'https://dolarapi.com/v1'
const HIST_BASE_URL = 'https://api.argentinadatos.com/v1/cotizaciones'

const CASAS = ['oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta']

export async function fetchDolares() {
  const res = await fetch(`${BASE_URL}/dolares`)
  if (!res.ok) throw new Error('No se pudo obtener la cotización del dólar')
  return res.json()
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
