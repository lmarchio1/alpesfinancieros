import { fetchArgBonds } from './data912Api'
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

// MEP vía AL30/AL30D: contrastado contra el cierre de referencia de Ámbito
// Financiero coincidió exacto ($1.535,08 los dos).
//
// CCL: entre GD30C (liquida en el exterior, lo conceptualmente correcto para
// "contado con liqui") y AL30C (liquida en el país, como el MEP), se elige en
// cada momento el que tenga el spread bid/ask más chico -es decir, el más
// líquido ahora mismo-. Verificado en vivo: GD30C llegó a tener 3.16% de
// spread (apenas 15.000/5.593 de volumen en punta) mientras AL30C se mantenía
// en 0.08% -el CCL vía GD30/GD30C daba $1.619 de venta, muy por encima del
// precio real de mercado ($1.611), y vía AL30/AL30C daba $1.605-. Nunca se
// mezclan las dos familias entre sí (no GD30 con AL30C ni viceversa), y
// siempre se usan puntas realmente operables, nunca el último precio operado
// (que puede quedar viejo).
async function fetchDolaresImplicitos() {
  try {
    const bonds = await fetchArgBonds()
    const porSimbolo = new Map(bonds.map((b) => [b.symbol, b]))
    const al30 = porSimbolo.get('AL30')
    const al30d = porSimbolo.get('AL30D')
    const al30c = porSimbolo.get('AL30C')
    const gd30 = porSimbolo.get('GD30')
    const gd30c = porSimbolo.get('GD30C')

    const ccl = spread(al30c) < spread(gd30c) ? implicito(al30, al30c) : implicito(gd30, gd30c)

    return { mep: implicito(al30, al30d), ccl }
  } catch {
    return { mep: null, ccl: null }
  }
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
