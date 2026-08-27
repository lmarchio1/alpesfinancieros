import { fetchArgBonds } from './data912Api'

const BASE_URL = 'https://dolarapi.com/v1'
const HIST_BASE_URL = 'https://api.argentinadatos.com/v1/cotizaciones'
const REF_DIARIA_KEY = 'alpes_ref_diaria_mep_ccl'

const CASAS = ['oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta']

function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

// Si la cotización todavía no se actualizó hoy (pasó la medianoche y el mercado
// no volvió a operar), la variación no debería mostrar el cambio ya cerrado de
// la rueda anterior como si fuera de hoy.
export function esCotizacionDeHoy(fechaActualizacion) {
  if (!fechaActualizacion) return false
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(
    new Date(fechaActualizacion)
  )
  return fecha === fechaArgentinaHoy()
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

// MEP vía AL30/AL30D y CCL vía GD30/GD30C: se compra el bono en pesos
// localmente y se vende en su variante en dólares -AL30D liquida en el país
// (MEP), GD30C liquida en cuentas de EE.UU. (CCL)-. Cada dólar usa su propia
// familia de bono (no se mezcla AL30 con GD30C): MEP contrastado contra el
// cierre de referencia de Ámbito Financiero coincidió exacto ($1.535,08 los
// dos); para CCL se probó también AL30/AL30C y quedó más cerca de Ámbito,
// pero se optó por GD30/GD30C de todos modos. Compra = vender el bono en
// pesos y comprarlo en dólares (base bid / variante ask); venta = al revés
// (base ask / variante bid) — mismo criterio bid/ask que usa el resto del
// sitio.
async function fetchDolaresImplicitos() {
  try {
    const bonds = await fetchArgBonds()
    const porSimbolo = new Map(bonds.map((b) => [b.symbol, b]))
    const al30 = porSimbolo.get('AL30')
    const al30d = porSimbolo.get('AL30D')
    const gd30 = porSimbolo.get('GD30')
    const gd30c = porSimbolo.get('GD30C')

    const implicito = (base, variante) => {
      if (!base?.px_bid || !base?.px_ask || !variante?.px_bid || !variante?.px_ask) return null
      return {
        compra: base.px_bid / variante.px_ask,
        venta: base.px_ask / variante.px_bid,
      }
    }

    return { mep: implicito(al30, al30d), ccl: implicito(gd30, gd30c) }
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
// Se busca a partir de la fecha de "fechaActualizacion" de CADA casa (no del reloj del
// visitante): pasada la medianoche el reloj ya marca un día nuevo, pero el precio en vivo
// sigue siendo el cierre de ayer hasta que dolarapi actualice. Buscar "ayer" desde hoy en
// ese momento se saltaba justo esa fecha (todavía sin cargar en el histórico) y terminaba
// comparando contra un día más viejo -mostrando una variación falsa en vez de "sin cambios"-.
export async function fetchDolaresAyer(precios) {
  const entries = await Promise.all(
    CASAS.map(async (casa) => {
      const fechaActualizacion = precios?.find((p) => p.casa === casa)?.fechaActualizacion
      const fromDate = fechaActualizacion ? new Date(fechaActualizacion) : new Date()
      return [casa, await fetchCasaPreviousClose(casa, fromDate)]
    })
  )
  return Object.fromEntries(entries)
}
