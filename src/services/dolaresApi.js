import { fetchArgBonds, fetchArgCcl } from './data912Api'
import { fetchCierresDeAyer } from './supabaseClient'

const BASE_URL = 'https://dolarapi.com/v1'

// Instrumento en cierres_diarios (Supabase) por cada "casa" que devuelve dolarapi.
// bolsa/contadoconliqui son MEP/CCL calculados por nosotros (fetchDolaresImplicitos),
// no por dolarapi, así que usan su propio nombre en la tabla.
const INSTRUMENTO_POR_CASA = {
  oficial: 'oficial',
  blue: 'blue',
  bolsa: 'mep',
  contadoconliqui: 'ccl',
  mayorista: 'mayorista',
  cripto: 'cripto',
  tarjeta: 'tarjeta',
}

// Compra = vender el bono en pesos y comprarlo en dólares (base bid / variante ask);
// venta = al revés (base ask / variante bid) — mismo criterio bid/ask que usa el
// resto del sitio.
function implicito(base, variante) {
  if (!base?.px_bid || !base?.px_ask || !variante?.px_bid || !variante?.px_ask) return null
  return {
    compra: base.px_bid / variante.px_ask,
    venta: base.px_ask / variante.px_bid,
    fuente: variante.symbol,
  }
}

function spread(bono) {
  if (!bono?.px_bid || !bono?.px_ask) return Infinity
  return (bono.px_ask - bono.px_bid) / bono.px_bid
}

// Desde las 17:30 ART (cierre del mercado local) y hasta que reabre al otro día
// (~11hs), la liquidez de GD30C se deteriora rápido y se queda así toda la
// madrugada -no se arregla solo porque cambió el día- (verificado: 3.16% de spread
// con 15.000/5.593 de volumen en punta). En el horario de rueda normal (~11 a 17:30)
// GD30/GD30C funciona bien, y comparar spreads todo el tiempo solo arriesgaría hacer
// saltar la fuente (GD30C/AL30C) de un pedido al siguiente sin necesidad.
function despuesDelCierre() {
  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
  const [hh, mm] = hhmm.split(':').map(Number)
  return hh > 17 || (hh === 17 && mm >= 30) || hh < 11
}

const CCL_CANASTA_N = 5
const CCL_CANASTA_SPREAD_MAX = 0.01 // 1%
const CCL_CANASTA_MIN = 3 // si hay menos candidatos confiables, no se usa la canasta

// CCL vía una canasta de los CEDEARs/ADRs más operados con spread ajustado (<1%),
// en vez de un ticker fijo -verificado en vivo: los 5-6 más líquidos (Apple,
// Microsoft, Nvidia, Meta, Amazon, Tesla, etc.) mantienen spreads de 0.3%-0.7%
// incluso con el mercado cerrado, mientras que GD30C se infla a más de 3% fuera
// de horario-. Se recalcula qué tickers entran en cada pedido según volumen real
// (ars_volume), no una lista fija: si mañana la liquidez se corre a otros
// papeles, se ajusta solo.
function cclPorCedears(ccl) {
  if (!Array.isArray(ccl)) return null
  const candidatos = ccl
    .filter((c) => c.ars_volume > 0 && c.CCL_bid > 0 && c.CCL_ask > 0)
    .filter((c) => (c.CCL_ask - c.CCL_bid) / c.CCL_bid < CCL_CANASTA_SPREAD_MAX)
    .sort((a, b) => b.ars_volume - a.ars_volume)
    .slice(0, CCL_CANASTA_N)

  if (candidatos.length < CCL_CANASTA_MIN) return null

  const compra = candidatos.reduce((suma, c) => suma + c.CCL_bid, 0) / candidatos.length
  const venta = candidatos.reduce((suma, c) => suma + c.CCL_ask, 0) / candidatos.length
  return { compra, venta, fuente: `${candidatos.length} CEDEARs` }
}

// MEP vía AL30/AL30D: contrastado contra el cierre de referencia de Ámbito
// Financiero coincidió exacto ($1.535,08 los dos).
async function fetchDolaresImplicitos() {
  let mep = null
  let ccl = null

  // Respaldo del CCL por bonos (GD30/GD30C durante el día, AL30/AL30C si tiene
  // mejor spread después de las 17:30) por si la canasta de CEDEARs no está
  // disponible o no tiene suficientes tickers confiables en ese momento.
  try {
    const bonds = await fetchArgBonds()
    const porSimbolo = new Map(bonds.map((b) => [b.symbol, b]))
    const al30 = porSimbolo.get('AL30')
    const al30d = porSimbolo.get('AL30D')
    const al30c = porSimbolo.get('AL30C')
    const gd30 = porSimbolo.get('GD30')
    const gd30c = porSimbolo.get('GD30C')

    mep = implicito(al30, al30d)
    const usarAl30c = despuesDelCierre() && spread(al30c) < spread(gd30c)
    ccl = usarAl30c ? implicito(al30, al30c) : implicito(gd30, gd30c)
  } catch {
    // sin bonos: mep queda null, ccl se intenta igual con la canasta de CEDEARs
  }

  try {
    const cedears = await fetchArgCcl()
    const cclCedears = cclPorCedears(cedears)
    if (cclCedears) ccl = cclCedears
  } catch {
    // sin datos912/ccl: se queda con el cálculo por bonos de arriba (o null)
  }

  return { mep, ccl }
}

export async function fetchDolares() {
  const [res, implicitos] = await Promise.all([fetch(`${BASE_URL}/dolares`), fetchDolaresImplicitos()])
  if (!res.ok) throw new Error('No se pudo obtener la cotización del dólar')
  const data = await res.json()

  return data.map((d) => {
    if (d.casa === 'bolsa' && implicitos.mep) return { ...d, ...implicitos.mep }
    if (d.casa === 'contadoconliqui' && implicitos.ccl) return { ...d, ...implicitos.ccl }
    return d
  })
}

// Cierre de cada casa a las 00hs de ayer (ver cierre-diario.yml), para comparar contra
// el precio en vivo. Reemplaza la búsqueda día-por-día contra argentinadatos.com (hasta
// 1.3s medidos en esta sesión) y la apertura por localStorage de MEP/CCL: ahora es una
// sola lectura a Supabase, igual para todos los visitantes sin importar el dispositivo
// o el momento en que entren -antes esa diferencia de timing era justo la causa de que
// PC y celular mostraran variaciones distintas-.
export async function fetchCierresDolares() {
  const instrumentos = Object.values(INSTRUMENTO_POR_CASA).flatMap((i) => [`${i}_compra`, `${i}_venta`])
  const cierres = await fetchCierresDeAyer(instrumentos)

  return Object.fromEntries(
    Object.entries(INSTRUMENTO_POR_CASA).map(([casa, instrumento]) => [
      casa,
      { compra: cierres[`${instrumento}_compra`], venta: cierres[`${instrumento}_venta`] },
    ])
  )
}
