// Corre vía GitHub Actions (ver .github/workflows/cierre-diario.yml) a las 00hs
// Argentina para guardar el cierre del día que acaba de terminar, en un solo lugar
// central (Supabase) compartido por todos los visitantes -reemplaza el respaldo por
// localStorage/JSON estático que antes podía quedar distinto entre navegadores según
// el momento en que cada uno cargó la página por primera vez en el día-.
//
// Reemplaza capturar-apertura-mep-ccl.mjs y capturar-apertura-mercado.mjs.

import { createClient } from '@supabase/supabase-js'
import { calcularImplicitos, esConfiable, fechaArgentina } from '../src/utils/dolaresImplicitos.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
// Pruebas locales: DRY_RUN=1 no escribe nada en Supabase (solo muestra lo que guardaría), y
// SIMULAR_PUNTAS_VACIAS=1 hace de cuenta que data912 vino sin puntas, como a medianoche.
const DRY_RUN = process.env.DRY_RUN === '1'
const SIMULAR_PUNTAS_VACIAS = process.env.SIMULAR_PUNTAS_VACIAS === '1'

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

// MEP/CCL implícito y universo de bonos/letras (data912). La cuenta está en
// src/utils/dolaresImplicitos.js, compartida con scripts/cachear-precios.mjs; es la misma
// metodología que usa el sitio en src/services/dolaresApi.js (fetchDolaresImplicitos).
const [bonds, notas, ccl912] = await Promise.all([
  getJson('https://data912.com/live/arg_bonds'),
  getJson('https://data912.com/live/arg_notes'),
  getJson('https://data912.com/live/ccl').catch(() => []),
])

// Los feriados no hay rueda y data912 devuelve las puntas vacías, y sin puntas no hay MEP
// ni CCL. Pasó el lunes 9 y el martes 10/11/2026: el cierre se guardó sin esos dos datos y
// el miércoles el sitio no tenía contra qué comparar (los fines de semana no pasa porque
// las puntas del viernes siguen ahí). Si no se pueden calcular en vivo, se usa el último
// valor válido que deja anotado la tarea de cada 5 minutos (scripts/cachear-precios.mjs):
// el feriado repite el cierre del último día hábil, igual que el fin de semana. Siete
// días alcanzan para cualquier feriado largo.
const DIAS_MAXIMOS_DEL_RESPALDO = 7
const enVivo = calcularImplicitos(SIMULAR_PUNTAS_VACIAS ? [] : bonds, SIMULAR_PUNTAS_VACIAS ? [] : ccl912)

let respaldo = null
async function ultimoValido(nombre) {
  if (respaldo === null) {
    const { data, error } = await supabase.from('precios_cache').select('datos').eq('fuente', 'dolares_implicitos').maybeSingle()
    if (error) console.error('No se pudo leer el último MEP/CCL guardado:', error.message)
    respaldo = data?.datos ?? {}
  }
  const guardado = respaldo[nombre]
  if (!esConfiable(guardado) || typeof guardado.fecha !== 'string') return null
  const dias = (Date.parse(fechaArgentina()) - Date.parse(guardado.fecha)) / 86400000
  return dias >= 0 && dias <= DIAS_MAXIMOS_DEL_RESPALDO ? guardado : null
}

// Si falta alguno de los dos al final, la tarea termina en error (después de guardar todo
// lo demás) para que llegue el aviso, en vez de quedar en verde con el dato faltante.
const sinDato = []
for (const nombre of ['mep', 'ccl']) {
  let dolar = esConfiable(enVivo[nombre]) ? enVivo[nombre] : null
  if (dolar) {
    console.log(`${nombre.toUpperCase()}: ${dolar.compra.toFixed(2)} / ${dolar.venta.toFixed(2)} (puntas en vivo).`)
  } else {
    dolar = await ultimoValido(nombre)
    if (dolar) {
      console.log(`${nombre.toUpperCase()}: ${dolar.compra.toFixed(2)} / ${dolar.venta.toFixed(2)} (sin puntas a esta hora; último valor válido, del ${dolar.capturado_en}).`)
    }
  }
  if (!dolar) {
    sinDato.push(nombre.toUpperCase())
    continue
  }
  agregar(`${nombre}_compra`, dolar.compra)
  agregar(`${nombre}_venta`, dolar.venta)
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

// Se guarda con la fecha de AYER (no la de hoy): el script corre de madrugada,
// antes de que abra el mercado (~11hs), así que lo que captura siempre es el
// cierre del día hábil anterior, nunca el de hoy -mismo cálculo de "ayer" que
// usa el front en fetchCierresDeAyer (supabaseClient.js), para que su
// `.eq('fecha', ayer)` siempre encuentre lo que corresponde. Antes se guardaba
// con la fecha de hoy, lo que generaba un desfasaje de un día completo apenas
// pasaba el primer día hábil real desde que el cron quedó automático -invisible
// los fines de semana porque viernes/sábado/domingo/lunes-de-madrugada tienen
// todos el mismo precio congelado-.
function fechaArgentinaAyer() {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
  const d = new Date(`${hoy}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

const fecha = fechaArgentinaAyer()
const registros = filas.map((f) => ({ fecha, ...f }))

if (DRY_RUN) {
  console.log(`[prueba] Cierre del ${fecha}: ${registros.length} instrumentos (no se guardó nada).`)
} else {
  const { error } = await supabase.from('cierres_diarios').upsert(registros, { onConflict: 'fecha,instrumento' })
  if (error) {
    console.error('Error al guardar en Supabase:', error.message)
    process.exit(1)
  }
  console.log(`Cierre del ${fecha} guardado: ${registros.length} instrumentos.`)
}

// Lo demás ya quedó guardado. Esto es para que la corrida figure en rojo y llegue el mail:
// sin el cierre de MEP o CCL, mañana el sitio no puede mostrar su variación del día.
if (sinDato.length > 0) {
  console.error(`ATENCIÓN: el cierre del ${fecha} quedó sin ${sinDato.join(' ni ')}: no hubo puntas en vivo ni un valor válido reciente guardado.`)
  process.exit(1)
}
