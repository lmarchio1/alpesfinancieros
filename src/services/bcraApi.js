import { fetchPreciosCache } from './supabaseClient'

const BASE_URL = 'https://api.bcra.gob.ar/estadisticas/v4.0/monetarias'

// El BCRA publica estos datos una vez por día -a diferencia de los bonos/CCL
// (30 min de default en fetchPreciosCache), acá no hay ningún problema en
// aceptar un caché de varias horas: sigue siendo el mismo cierre del día
// hasta que el BCRA publique el próximo. Con esta ventana más ancha, el
// caché protege de verdad contra que la API del BCRA falle, en vez de
// descartarse casi siempre por "vieja" cuando el Action tarda en correr.
const BCRA_CACHE_MAX_ANTIGUEDAD_MS = 12 * 60 * 60 * 1000 // 12 horas

// Régimen de bandas cambiarias del BCRA: Límite inferior (1187) y superior (1188),
// ajustan a diario según la inflación (T-2). La serie tiene fechas futuras ya
// publicadas (por eso acotamos "hasta" a hoy) pero el valor de "hoy" puede no
// estar cargado todavía (fines de semana/feriados) — por eso pedimos una
// ventana de varios días y nos quedamos con el más reciente disponible.
const ID_PISO = 1187
const ID_TECHO = 1188

// Tasas de referencia del BCRA (todas en % nominal anual, bancos privados donde aplica).
// Plazo fijo 30 días: variable "Principales Variables" de la propia API del BCRA.
// BADLAR: tasa mayorista histórica (depósitos >$1M a 30-35 días).
// TAMAR: reemplazo gradual de la BADLAR desde fines de 2024, mismo tipo de depósito mayorista.
const ID_PLAZO_FIJO_30D = 12
const ID_BADLAR = 7
const ID_TAMAR = 136

// Tasas efectivas anuales (TEA) que el propio BCRA publica como variables
// separadas para BADLAR y TAMAR. Para el plazo fijo genérico de 30 días no
// existe una TEA publicada, así que se calcula con la misma fórmula de
// capitalización que usa el BCRA (validado: aplicada a BADLAR/TAMAR da un
// resultado a menos de 0,03 puntos de la TEA que ellos mismos publican).
const ID_BADLAR_TEA = 35
const ID_TAMAR_TEA = 137

// Reservas internacionales brutas del BCRA (saldo diario, en millones de USD).
const ID_RESERVAS = 1

// Inflación mensual (IPC - INDEC), republicada por el BCRA como variable propia.
const ID_INFLACION_MENSUAL = 27

function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

function haceNDias(fechaIso, n) {
  const d = new Date(`${fechaIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

async function fetchSerie(idVariable, desde, hasta) {
  const res = await fetch(`${BASE_URL}/${idVariable}?desde=${desde}&hasta=${hasta}`)
  if (!res.ok) throw new Error('No se pudo obtener la información del BCRA')
  const json = await res.json()
  // La API devuelve el detalle ordenado del más reciente al más antiguo.
  return json.results?.[0]?.detalle ?? []
}

async function fetchUltimoValor(idVariable, desde, hasta) {
  const serie = await fetchSerie(idVariable, desde, hasta)
  return serie[0] ?? null
}

// Convierte una TNA a TEA capitalizando cada "dias" (30 por defecto), el
// mismo criterio que usa el BCRA para sus propias series de TEA.
function tnaATea(tnaPct, dias = 30) {
  if (typeof tnaPct !== 'number') return null
  const n = 365 / dias
  return (Math.pow(1 + tnaPct / 100 / n, n) - 1) * 100
}

// Reservas/BADLAR/TAMAR/Plazo fijo/Banda cambiaria son datos que el BCRA
// publica una vez por día, y su API pública es conocida por fallar/tardar de
// forma intermitente -cada tarjeta reintenta 2 veces y si sigue sin
// responder, desaparece en silencio en vez de mostrar un error, así que un
// visitante podía ver la tarjeta faltante según el momento justo en que
// entraba, mientras otro no-. Igual que con data912, se intenta primero el
// caché de Supabase (actualizado cada 5 min por scripts/cachear-precios.mjs)
// antes de pegarle directo al BCRA; si no hay caché o está vieja, cae al
// fetch de siempre.
//
// Reservas/BADLAR/TAMAR/Plazo fijo/Banda viven todas en la misma fila de
// Supabase (fuente 'bcra_variables'): cuando varias tarjetas se montan juntas
// (Renta Fija: ReservasCard + BadlarCard + TamarCard, las tres al mismo
// tiempo) cada una pedía esa misma fila por separado -confirmado en vivo,
// tres pedidos idénticos en el mismo milisegundo-. Este mapa evita el
// duplicado, mismo patrón que enVuelo en data912Api.js.
const enVuelo = new Map()

async function fetchVariablesBcra() {
  if (enVuelo.has('bcra_variables')) return enVuelo.get('bcra_variables')
  const promesa = fetchPreciosCache('bcra_variables', BCRA_CACHE_MAX_ANTIGUEDAD_MS)
  enVuelo.set('bcra_variables', promesa)
  promesa.finally(() => enVuelo.delete('bcra_variables'))
  return promesa
}

export async function fetchBandaCambiaria() {
  const cache = await fetchVariablesBcra()
  if (cache?.banda) return cache.banda

  const hoy = fechaArgentinaHoy()
  const desde = haceNDias(hoy, 7)
  const [piso, techo] = await Promise.all([
    fetchUltimoValor(ID_PISO, desde, hoy),
    fetchUltimoValor(ID_TECHO, desde, hoy),
  ])
  if (!piso || !techo) return null
  return { piso: piso.valor, techo: techo.valor, fecha: piso.fecha }
}

export async function fetchTasaPlazoFijo30Dias() {
  const cache = await fetchVariablesBcra()
  if (cache?.plazoFijo) return cache.plazoFijo

  const hoy = fechaArgentinaHoy()
  const desde = haceNDias(hoy, 10)
  const serie = await fetchSerie(ID_PLAZO_FIJO_30D, desde, hoy)
  const actual = serie[0]
  if (!actual) return null
  return {
    valor: actual.valor,
    fecha: actual.fecha,
    valorAnterior: serie[1]?.valor ?? null,
    tea: tnaATea(actual.valor),
    teaAnterior: serie[1] ? tnaATea(serie[1].valor) : null,
  }
}

export async function fetchReservasInternacionales() {
  const cache = await fetchVariablesBcra()
  if (cache?.reservas) return cache.reservas

  const hoy = fechaArgentinaHoy()
  const desde = haceNDias(hoy, 10)
  const serie = await fetchSerie(ID_RESERVAS, desde, hoy)
  const actual = serie[0]
  if (!actual) return null
  return { valor: actual.valor, fecha: actual.fecha, valorAnterior: serie[1]?.valor ?? null }
}

// Serie mensual de inflación (IPC - INDEC), [{ fecha, valor: %mensual }] ascendente.
export async function fetchInflacionMensual() {
  const hoy = fechaArgentinaHoy()
  const serie = await fetchSerie(ID_INFLACION_MENSUAL, '2015-01-01', hoy)
  return serie.slice().reverse()
}

export async function fetchBadlar() {
  const cache = await fetchVariablesBcra()
  if (cache?.badlar) return cache.badlar

  const hoy = fechaArgentinaHoy()
  const desde = haceNDias(hoy, 10)
  const [serie, teaSerie] = await Promise.all([
    fetchSerie(ID_BADLAR, desde, hoy),
    fetchSerie(ID_BADLAR_TEA, desde, hoy),
  ])
  const actual = serie[0]
  if (!actual) return null
  return {
    valor: actual.valor,
    fecha: actual.fecha,
    valorAnterior: serie[1]?.valor ?? null,
    tea: teaSerie[0]?.valor ?? null,
    teaAnterior: teaSerie[1]?.valor ?? null,
  }
}

export async function fetchTamar() {
  const cache = await fetchVariablesBcra()
  if (cache?.tamar) return cache.tamar

  const hoy = fechaArgentinaHoy()
  const desde = haceNDias(hoy, 10)
  const [serie, teaSerie] = await Promise.all([
    fetchSerie(ID_TAMAR, desde, hoy),
    fetchSerie(ID_TAMAR_TEA, desde, hoy),
  ])
  const actual = serie[0]
  if (!actual) return null
  return {
    valor: actual.valor,
    fecha: actual.fecha,
    valorAnterior: serie[1]?.valor ?? null,
    tea: teaSerie[0]?.valor ?? null,
    teaAnterior: teaSerie[1]?.valor ?? null,
  }
}
