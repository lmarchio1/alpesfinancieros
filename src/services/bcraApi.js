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

function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

function haceNDias(fechaIso, n) {
  const d = new Date(`${fechaIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

async function fetchUltimoValor(idVariable, desde, hasta) {
  const res = await fetch(`${BASE_URL}/${idVariable}?desde=${desde}&hasta=${hasta}`)
  if (!res.ok) throw new Error('No se pudo obtener la banda cambiaria')
  const json = await res.json()
  return json.results?.[0]?.detalle?.[0] ?? null
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
  const desde = haceNDias(hoy, 7)
  const dato = await fetchUltimoValor(ID_PLAZO_FIJO_30D, desde, hoy)
  if (!dato) return null
  return { valor: dato.valor, fecha: dato.fecha }
}

export async function fetchTasasReferencia() {
  const hoy = fechaArgentinaHoy()
  const desde = haceNDias(hoy, 7)
  const [badlar, tamar] = await Promise.all([
    fetchUltimoValor(ID_BADLAR, desde, hoy),
    fetchUltimoValor(ID_TAMAR, desde, hoy),
  ])
  return {
    badlar: badlar ? { valor: badlar.valor, fecha: badlar.fecha } : null,
    tamar: tamar ? { valor: tamar.valor, fecha: tamar.fecha } : null,
  }
}
