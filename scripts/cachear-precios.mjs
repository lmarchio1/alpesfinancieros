// Corre vía GitHub Actions (ver .github/workflows/cachear-precios.yml) cada 10
// minutos para cachear en Supabase la respuesta cruda de data912 (bonos y letras) —
// la pestaña Renta Fija dejar de depender de pegarle a data912.com en cada apertura
// de pestaña, mejorando bastante el tiempo de carga. Si esta cache falta o está vieja,
// el front (data912Api.js) cae solo al fetch directo de siempre.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function cachear(fuente, url) {
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`No se pudo obtener ${url}: ${res.status}`)
    return false
  }
  const datos = await res.json()
  const { error } = await supabase
    .from('precios_cache')
    .upsert({ fuente, datos, actualizado_en: new Date().toISOString() }, { onConflict: 'fuente' })
  if (error) {
    console.error(`Error al guardar ${fuente} en Supabase:`, error.message)
    return false
  }
  console.log(`${fuente} cacheado: ${Array.isArray(datos) ? datos.length : 1} registros.`)
  return true
}

// BCRA: Reservas/BADLAR/TAMAR/Plazo fijo/Banda cambiaria son datos que el BCRA
// publica una vez por día (no como los bonos, que se mueven todo el tiempo), y
// su API pública es conocida por fallar/tardar de forma intermitente -cada
// tarjeta reintenta 2 veces y si sigue sin responder, desaparece en silencio
// en vez de mostrar un error (a propósito, para no mostrar una tarjeta rota) -
// eso hacía que algunos visitantes vieran tarjetas faltantes según el momento
// justo en que entraban, mientras que otros no. Cachearlo acá, igual que los
// bonos, evita depender de que el BCRA responda bien en el momento exacto en
// que cada visitante abre la página: mismos IDs de variable que
// src/services/bcraApi.js, duplicado a mano porque ese archivo importa
// supabaseClient.js (depende de import.meta.env, no disponible en Node).
const BCRA_BASE = 'https://api.bcra.gob.ar/estadisticas/v4.0/monetarias'
const BCRA_IDS = { piso: 1187, techo: 1188, plazoFijo: 12, badlar: 7, badlarTea: 35, tamar: 136, tamarTea: 137, reservas: 1 }

function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}
function haceNDias(fechaIso, n) {
  const d = new Date(`${fechaIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}
async function fetchSerieBcra(idVariable, desde, hasta) {
  const res = await fetch(`${BCRA_BASE}/${idVariable}?desde=${desde}&hasta=${hasta}`)
  if (!res.ok) throw new Error(`BCRA variable ${idVariable}: ${res.status}`)
  const json = await res.json()
  return json.results?.[0]?.detalle ?? []
}
// Misma fórmula de capitalización que usa bcraApi.js para la TEA del plazo fijo.
function tnaATea(tnaPct, dias = 30) {
  if (typeof tnaPct !== 'number') return null
  const n = 365 / dias
  return (Math.pow(1 + tnaPct / 100 / n, n) - 1) * 100
}

async function cachearBcra() {
  const hoy = fechaArgentinaHoy()
  const desde7 = haceNDias(hoy, 7)
  const desde10 = haceNDias(hoy, 10)
  try {
    const [piso, techo, plazoFijo, badlar, badlarTea, tamar, tamarTea, reservas] = await Promise.all([
      fetchSerieBcra(BCRA_IDS.piso, desde7, hoy),
      fetchSerieBcra(BCRA_IDS.techo, desde7, hoy),
      fetchSerieBcra(BCRA_IDS.plazoFijo, desde10, hoy),
      fetchSerieBcra(BCRA_IDS.badlar, desde10, hoy),
      fetchSerieBcra(BCRA_IDS.badlarTea, desde10, hoy),
      fetchSerieBcra(BCRA_IDS.tamar, desde10, hoy),
      fetchSerieBcra(BCRA_IDS.tamarTea, desde10, hoy),
      fetchSerieBcra(BCRA_IDS.reservas, desde10, hoy),
    ])

    const datos = {
      banda: piso[0] && techo[0] ? { piso: piso[0].valor, techo: techo[0].valor, fecha: piso[0].fecha } : null,
      plazoFijo: plazoFijo[0]
        ? {
            valor: plazoFijo[0].valor,
            fecha: plazoFijo[0].fecha,
            valorAnterior: plazoFijo[1]?.valor ?? null,
            tea: tnaATea(plazoFijo[0].valor),
            teaAnterior: plazoFijo[1] ? tnaATea(plazoFijo[1].valor) : null,
          }
        : null,
      badlar: badlar[0]
        ? {
            valor: badlar[0].valor,
            fecha: badlar[0].fecha,
            valorAnterior: badlar[1]?.valor ?? null,
            tea: badlarTea[0]?.valor ?? null,
            teaAnterior: badlarTea[1]?.valor ?? null,
          }
        : null,
      tamar: tamar[0]
        ? {
            valor: tamar[0].valor,
            fecha: tamar[0].fecha,
            valorAnterior: tamar[1]?.valor ?? null,
            tea: tamarTea[0]?.valor ?? null,
            teaAnterior: tamarTea[1]?.valor ?? null,
          }
        : null,
      reservas: reservas[0]
        ? { valor: reservas[0].valor, fecha: reservas[0].fecha, valorAnterior: reservas[1]?.valor ?? null }
        : null,
    }

    const { error } = await supabase
      .from('precios_cache')
      .upsert({ fuente: 'bcra_variables', datos, actualizado_en: new Date().toISOString() }, { onConflict: 'fuente' })
    if (error) {
      console.error('Error al guardar bcra_variables en Supabase:', error.message)
      return false
    }
    console.log('bcra_variables cacheado.')
    return true
  } catch (err) {
    console.error('No se pudo cachear bcra_variables:', err.message)
    return false
  }
}

const resultados = await Promise.all([
  cachear('data912_arg_bonds', 'https://data912.com/live/arg_bonds'),
  cachear('data912_arg_notes', 'https://data912.com/live/arg_notes'),
  cachear('data912_ccl', 'https://data912.com/live/ccl'),
  cachearBcra(),
])

if (resultados.every((ok) => !ok)) process.exit(1)
