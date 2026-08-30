// Corre vía GitHub Actions (ver .github/workflows/cierre-diario.yml) a las 00hs
// Argentina para guardar el cierre del día que acaba de terminar, en un solo lugar
// central (Supabase) compartido por todos los visitantes -reemplaza el respaldo por
// localStorage/JSON estático que antes podía quedar distinto entre navegadores según
// el momento en que cada uno cargó la página por primera vez en el día-.
//
// Reemplaza capturar-apertura-mep-ccl.mjs y capturar-apertura-mercado.mjs.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo obtener ${url}: ${res.status}`)
  return res.json()
}

const filas = []
const agregar = (instrumento, valor) => {
  if (typeof valor === 'number' && valor > 0) filas.push({ instrumento, valor })
}

// Dólares (dolarapi): compra/venta por casa. bolsa/contadoconliqui (MEP/CCL) se
// excluyen acá: la app no usa el valor de dolarapi para esas dos, usa el implícito
// vía AL30/GD30 (mep_compra/ccl_compra más abajo) — guardar también el de dolarapi
// sería un dato que nadie lee.
const dolares = await getJson('https://dolarapi.com/v1/dolares')
for (const d of dolares) {
  if (d.casa === 'bolsa' || d.casa === 'contadoconliqui') continue
  agregar(`${d.casa}_compra`, d.compra)
  agregar(`${d.casa}_venta`, d.venta)
}

// MEP/CCL implícito y universo de bonos/letras (data912): misma metodología que
// src/services/dolaresApi.js (fetchDolaresImplicitos) — no duplicar ese archivo acá
// porque corre en Node, no en el navegador; se mantiene la fórmula sincronizada a mano.
const [bonds, notas, ccl912] = await Promise.all([
  getJson('https://data912.com/live/arg_bonds'),
  getJson('https://data912.com/live/arg_notes'),
  getJson('https://data912.com/live/ccl').catch(() => []),
])

const porSimbolo = new Map(bonds.map((b) => [b.symbol, b]))
const implicito = (base, variante) => {
  if (!base?.px_bid || !base?.px_ask || !variante?.px_bid || !variante?.px_ask) return null
  return { compra: base.px_bid / variante.px_ask, venta: base.px_ask / variante.px_bid }
}
const spread = (bono) => {
  if (!bono?.px_bid || !bono?.px_ask) return Infinity
  return (bono.px_ask - bono.px_bid) / bono.px_bid
}
const mep = implicito(porSimbolo.get('AL30'), porSimbolo.get('AL30D'))

// CCL: canasta fija de blue chips grandes (no ranking por volumen — dejaba
// entrar a MU/MSTR, que meten ruido) — mismo criterio que
// src/services/dolaresApi.js (cclPorCedears), ver el comentario ahí. Si data912
// no responde ese endpoint o no hay suficientes tickers confiables, cae al
// cálculo por bonos (GD30/GD30C, o AL30/AL30C si tiene mejor spread después de
// las 17:30 ART).
const CCL_CANASTA_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA']
function cclPorCedears(datos) {
  if (!Array.isArray(datos)) return null
  const porTicker = new Map(datos.map((c) => [c.ticker_ar, c]))
  const candidatos = CCL_CANASTA_TICKERS.map((t) => porTicker.get(t)).filter(
    (c) => c?.CCL_bid > 0 && c?.CCL_ask > 0 && (c.CCL_ask - c.CCL_bid) / c.CCL_bid < 0.01
  )
  if (candidatos.length < 3) return null
  return {
    compra: candidatos.reduce((s, c) => s + c.CCL_bid, 0) / candidatos.length,
    venta: candidatos.reduce((s, c) => s + c.CCL_ask, 0) / candidatos.length,
  }
}

const hhmm = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Argentina/Buenos_Aires',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
}).format(new Date())
const [hh, mm] = hhmm.split(':').map(Number)
const despuesDelCierre = hh > 17 || (hh === 17 && mm >= 30) || hh < 11

const al30c = porSimbolo.get('AL30C')
const gd30c = porSimbolo.get('GD30C')
const usarAl30c = despuesDelCierre && spread(al30c) < spread(gd30c)
const cclBonos = usarAl30c
  ? implicito(porSimbolo.get('AL30'), al30c)
  : implicito(porSimbolo.get('GD30'), gd30c)
const ccl = cclPorCedears(ccl912) ?? cclBonos
if (mep) {
  agregar('mep_compra', mep.compra)
  agregar('mep_venta', mep.venta)
}
if (ccl) {
  agregar('ccl_compra', ccl.compra)
  agregar('ccl_venta', ccl.venta)
}

// Todos los símbolos de bonos/letras (no solo los que hoy se muestran en el sitio: el
// front filtra según bondsReference.js/el listado de letras vigentes, esto solo guarda
// el precio para que ese filtro lo siga haciendo el front como ya hace).
for (const item of [...bonds, ...notas]) {
  agregar(item.symbol, item.c)
}

// Riesgo país (reemplaza el cache en localStorage de rentaFijaApi.js).
try {
  const riesgoPais = await getJson('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo')
  agregar('riesgo_pais', riesgoPais.valor)
} catch (err) {
  console.error('No se pudo obtener riesgo país (se sigue sin ese dato):', err.message)
}

if (filas.length === 0) {
  console.error('No se capturó ningún valor. Abortando sin escribir nada.')
  process.exit(1)
}

const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
const registros = filas.map((f) => ({ fecha, ...f }))

const { error } = await supabase.from('cierres_diarios').upsert(registros, { onConflict: 'fecha,instrumento' })
if (error) {
  console.error('Error al guardar en Supabase:', error.message)
  process.exit(1)
}

console.log(`Cierre del ${fecha} guardado: ${registros.length} instrumentos.`)
