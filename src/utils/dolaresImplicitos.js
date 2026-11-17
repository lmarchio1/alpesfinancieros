// Dólar MEP y CCL implícitos a partir de las puntas de data912, para las tareas
// programadas (scripts/cachear-precios.mjs y scripts/capturar-cierre-diario.mjs). Misma
// metodología que usa el sitio en src/services/dolaresApi.js (fetchDolaresImplicitos); ese
// archivo conserva su propia copia porque además depende de cosas del navegador. Si se
// cambia la fórmula, cambiarla en los dos lados.
//
// Sin dependencias: corre igual en Node y en el navegador.

// Compra = vender el bono en pesos y comprarlo en dólares (base bid / variante ask);
// venta = al revés (base ask / variante bid).
export function implicito(base, variante) {
  if (!base?.px_bid || !base?.px_ask || !variante?.px_bid || !variante?.px_ask) return null
  return { compra: base.px_bid / variante.px_ask, venta: base.px_ask / variante.px_bid, fuente: variante.symbol }
}

export function spread(bono) {
  if (!bono?.px_bid || !bono?.px_ask) return Infinity
  return (bono.px_ask - bono.px_bid) / bono.px_bid
}

// Desde las 17:30 ART y hasta que reabre el mercado (~11 hs) la liquidez de GD30C se
// deteriora: en ese horario se usa AL30C si tiene mejor spread (ver dolaresApi.js).
export function despuesDelCierre(ahora = new Date()) {
  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(ahora)
  const [hh, mm] = hhmm.split(':').map(Number)
  return hh > 17 || (hh === 17 && mm >= 30) || hh < 11
}

// CCL: canasta fija de blue chips grandes (no ranking por volumen, que dejaba entrar a
// MU/MSTR y metía ruido).
const CCL_CANASTA_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA']
const CCL_CANASTA_SPREAD_MAX = 0.01
const CCL_CANASTA_MIN = 3

export function cclPorCedears(cedears) {
  if (!Array.isArray(cedears)) return null
  const porTicker = new Map(cedears.map((c) => [c.ticker_ar, c]))
  const candidatos = CCL_CANASTA_TICKERS.map((t) => porTicker.get(t)).filter(
    (c) => c?.CCL_bid > 0 && c?.CCL_ask > 0 && (c.CCL_ask - c.CCL_bid) / c.CCL_bid < CCL_CANASTA_SPREAD_MAX,
  )
  if (candidatos.length < CCL_CANASTA_MIN) return null
  return {
    compra: candidatos.reduce((suma, c) => suma + c.CCL_bid, 0) / candidatos.length,
    venta: candidatos.reduce((suma, c) => suma + c.CCL_ask, 0) / candidatos.length,
    fuente: `${candidatos.length} CEDEARs`,
  }
}

// MEP (AL30/AL30D) y CCL (canasta de CEDEARs; si no hay, por bonos) con lo que haya en
// este momento. Cada uno queda en null si faltan las puntas: fuera del horario de rueda
// data912 puede devolverlas vacías, y eso no es un error.
export function calcularImplicitos(bonos, cedears, ahora = new Date()) {
  const porSimbolo = new Map((Array.isArray(bonos) ? bonos : []).map((b) => [b.symbol, b]))
  const al30 = porSimbolo.get('AL30')
  const al30c = porSimbolo.get('AL30C')
  const gd30c = porSimbolo.get('GD30C')
  const usarAl30c = despuesDelCierre(ahora) && spread(al30c) < spread(gd30c)
  const cclBonos = usarAl30c ? implicito(al30, al30c) : implicito(porSimbolo.get('GD30'), gd30c)
  return {
    mep: implicito(al30, porSimbolo.get('AL30D')),
    ccl: cclPorCedears(cedears) ?? cclBonos,
  }
}

// Un valor sirve como "último válido" solo si tiene sentido: compra y venta positivas, la
// venta no por debajo de la compra y una diferencia entre ambas de menos del 3%. Con
// puntas ralas (una sola orden lejos del precio) la cuenta da un número, pero no un precio.
const DIFERENCIA_MAXIMA = 0.03

export function esConfiable(dolar) {
  if (!dolar || !(dolar.compra > 0) || !(dolar.venta > 0)) return false
  return dolar.venta >= dolar.compra && (dolar.venta - dolar.compra) / dolar.compra < DIFERENCIA_MAXIMA
}

export function fechaArgentina(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora)
}
