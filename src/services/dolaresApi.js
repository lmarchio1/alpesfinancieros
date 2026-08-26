import { fetchArgBonds } from './data912Api'

const BASE_URL = 'https://dolarapi.com/v1'
const HIST_BASE_URL = 'https://api.argentinadatos.com/v1/cotizaciones'
const REF_DIARIA_KEY = 'alpes_ref_diaria_mep_ccl'

const CASAS = ['oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta']

function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

// Apertura diaria de MEP/CCL, capturada una vez por día hábil por un GitHub
// Action (ver .github/workflows/apertura-mep-ccl.yml) y guardada como JSON
// estático: misma apertura para todos los visitantes, sin backend propio.
async function fetchAperturaCentral() {
  try {
    const res = await fetch(`/apertura-mep-ccl.json?_=${Date.now()}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.fecha === fechaArgentinaHoy() ? data : null
  } catch {
    return null
  }
}

// Respaldo si el archivo de apertura central todavía no se actualizó hoy
// (temprano a la mañana antes de que corra el Action, o si llegara a
// fallar): se usa como referencia el primer valor AL30 visto hoy en este
// navegador. Se guarda en localStorage y se reinicia solo al cambiar la fecha.
function referenciaDiaria(clave, valorActual) {
  if (typeof valorActual !== 'number' || typeof localStorage === 'undefined') return valorActual
  const hoy = fechaArgentinaHoy()
  let datos
  try {
    datos = JSON.parse(localStorage.getItem(REF_DIARIA_KEY) || '{}')
  } catch {
    datos = {}
  }
  if (datos.fecha !== hoy) datos = { fecha: hoy }
  if (typeof datos[clave] !== 'number') {
    datos[clave] = valorActual
    try {
      localStorage.setItem(REF_DIARIA_KEY, JSON.stringify(datos))
    } catch {
      // localStorage puede no estar disponible (modo privado, cuota llena).
    }
  }
  return datos[clave]
}

// MEP y CCL implícitos vía AL30: se compra el bono en pesos localmente y se
// vende en su variante en dólares — AL30D (48hs, liquida en el país) para
// MEP, AL30C (liquida en cuentas de EE.UU.) para CCL. Contrastado contra el
// cierre de referencia de Ámbito Financiero: MEP coincidió exacto
// ($1.535,08 los dos), CCL quedó a 0,11% de diferencia, mientras que
// dolarapi.com venía mostrando un MEP con diferencias de hasta $20. Compra =
// vender el bono en pesos y comprarlo en dólares (AL30 bid / variante ask);
// venta = al revés (AL30 ask / variante bid) — mismo criterio bid/ask que
// usa el resto del sitio.
async function fetchDolaresImplicitos() {
  try {
    const bonds = await fetchArgBonds()
    const porSimbolo = new Map(bonds.map((b) => [b.symbol, b]))
    const al30 = porSimbolo.get('AL30')
    const al30d = porSimbolo.get('AL30D')
    const al30c = porSimbolo.get('AL30C')

    const implicito = (variante) => {
      if (!al30?.px_bid || !al30?.px_ask || !variante?.px_bid || !variante?.px_ask) return null
      return {
        compra: al30.px_bid / variante.px_ask,
        venta: al30.px_ask / variante.px_bid,
      }
    }

    return { mep: implicito(al30d), ccl: implicito(al30c) }
  } catch {
    return { mep: null, ccl: null }
  }
}

export async function fetchDolares() {
  const [res, implicitos, apertura] = await Promise.all([
    fetch(`${BASE_URL}/dolares`),
    fetchDolaresImplicitos(),
    fetchAperturaCentral(),
  ])
  if (!res.ok) throw new Error('No se pudo obtener la cotización del dólar')
  const data = await res.json()

  return data.map((d) => {
    if (d.casa === 'bolsa' && implicitos.mep) {
      return {
        ...d,
        ...implicitos.mep,
        compraApertura: apertura?.mep?.compra ?? referenciaDiaria('mep_compra', implicitos.mep.compra),
        ventaApertura: apertura?.mep?.venta ?? referenciaDiaria('mep_venta', implicitos.mep.venta),
      }
    }
    if (d.casa === 'contadoconliqui' && implicitos.ccl) {
      return {
        ...d,
        ...implicitos.ccl,
        compraApertura: apertura?.ccl?.compra ?? referenciaDiaria('ccl_compra', implicitos.ccl.compra),
        ventaApertura: apertura?.ccl?.venta ?? referenciaDiaria('ccl_venta', implicitos.ccl.venta),
      }
    }
    return d
  })
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
