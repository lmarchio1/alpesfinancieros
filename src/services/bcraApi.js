const BASE_URL = 'https://api.bcra.gob.ar/estadisticas/v4.0/monetarias'

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

export async function fetchBandaCambiaria() {
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
  const hoy = fechaArgentinaHoy()
  const desde = haceNDias(hoy, 10)
  const serie = await fetchSerie(ID_PLAZO_FIJO_30D, desde, hoy)
  const actual = serie[0]
  if (!actual) return null
  return { valor: actual.valor, fecha: actual.fecha, valorAnterior: serie[1]?.valor ?? null }
}

export async function fetchReservasInternacionales() {
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

export async function fetchTasasReferencia() {
  const hoy = fechaArgentinaHoy()
  const desde = haceNDias(hoy, 10)
  const [badlarSerie, tamarSerie] = await Promise.all([
    fetchSerie(ID_BADLAR, desde, hoy),
    fetchSerie(ID_TAMAR, desde, hoy),
  ])
  const badlar = badlarSerie[0]
  const tamar = tamarSerie[0]
  return {
    badlar: badlar ? { valor: badlar.valor, fecha: badlar.fecha, valorAnterior: badlarSerie[1]?.valor ?? null } : null,
    tamar: tamar ? { valor: tamar.valor, fecha: tamar.fecha, valorAnterior: tamarSerie[1]?.valor ?? null } : null,
  }
}
