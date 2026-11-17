// Corre vía GitHub Actions (ver .github/workflows/cachear-precios.yml) cada 10
// minutos para cachear en Supabase la respuesta cruda de data912 (bonos y letras) —
// la pestaña Renta Fija dejar de depender de pegarle a data912.com en cada apertura
// de pestaña, mejorando bastante el tiempo de carga. Si esta cache falta o está vieja,
// el front (data912Api.js) cae solo al fetch directo de siempre.

import { createClient } from '@supabase/supabase-js'
import { calcularImplicitos, esConfiable, fechaArgentina } from '../src/utils/dolaresImplicitos.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
// Prueba local: DRY_RUN=1 no escribe nada en Supabase, solo muestra lo que guardaría.
const DRY_RUN = process.env.DRY_RUN === '1'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Devuelve los datos si se pudieron bajar y guardar, o null si algo falló.
async function cachear(fuente, url) {
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`No se pudo obtener ${url}: ${res.status}`)
    return null
  }
  const datos = await res.json()
  if (DRY_RUN) {
    console.log(`[prueba] ${fuente}: ${Array.isArray(datos) ? datos.length : 1} registros (no se guardó).`)
    return datos
  }
  const { error } = await supabase
    .from('precios_cache')
    .upsert({ fuente, datos, actualizado_en: new Date().toISOString() }, { onConflict: 'fuente' })
  if (error) {
    console.error(`Error al guardar ${fuente} en Supabase:`, error.message)
    return null
  }
  console.log(`${fuente} cacheado: ${Array.isArray(datos) ? datos.length : 1} registros.`)
  return datos
}

// Último dólar MEP y CCL válidos. El cierre diario (scripts/capturar-cierre-diario.mjs)
// corre a las 00:15, y a esa hora data912 puede devolver las puntas vacías: sin puntas no
// hay MEP ni CCL, el cierre quedaba sin esos dos datos y al día siguiente el sitio no
// mostraba su variación (pasó el 9 y el 10/11/2026). Por eso, cada vez que esta tarea ve
// puntas válidas deja anotado el valor; el cierre lo usa cuando no puede calcularlo.
//
// Se guarda cada dólar por separado, con su fecha: si en una corrida solo se puede
// calcular uno de los dos, el otro conserva el último que tenía.
const FUENTE_IMPLICITOS = 'dolares_implicitos'

async function guardarImplicitos(bonos, cedears) {
  const ahora = new Date()
  const { mep, ccl } = calcularImplicitos(bonos, cedears, ahora)
  const nuevos = {}
  for (const [nombre, dolar] of Object.entries({ mep, ccl })) {
    if (esConfiable(dolar)) {
      nuevos[nombre] = { compra: dolar.compra, venta: dolar.venta, fuente: dolar.fuente, fecha: fechaArgentina(ahora), capturado_en: ahora.toISOString() }
    }
  }
  if (Object.keys(nuevos).length === 0) {
    console.log('MEP/CCL: sin puntas válidas en este momento; se conserva el último valor guardado.')
    return
  }

  const { data: fila, error: errorLectura } = await supabase.from('precios_cache').select('datos').eq('fuente', FUENTE_IMPLICITOS).maybeSingle()
  if (errorLectura) {
    console.error(`No se pudo leer ${FUENTE_IMPLICITOS}:`, errorLectura.message)
    return
  }
  const datos = { ...(fila?.datos ?? {}), ...nuevos }
  const resumen = Object.entries(nuevos).map(([n, d]) => `${n.toUpperCase()} ${d.compra.toFixed(2)} / ${d.venta.toFixed(2)}`).join(' · ')
  if (DRY_RUN) {
    console.log(`[prueba] ${FUENTE_IMPLICITOS}: ${resumen} (no se guardó).`)
    return
  }
  const { error } = await supabase
    .from('precios_cache')
    .upsert({ fuente: FUENTE_IMPLICITOS, datos, actualizado_en: ahora.toISOString() }, { onConflict: 'fuente' })
  if (error) console.error(`Error al guardar ${FUENTE_IMPLICITOS} en Supabase:`, error.message)
  else console.log(`${FUENTE_IMPLICITOS} guardado: ${resumen}.`)
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

    if (DRY_RUN) {
      console.log('[prueba] bcra_variables (no se guardó).')
      return true
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

// Es un agregado: si falla, no cambia el resultado de la tarea.
try {
  await guardarImplicitos(resultados[0], resultados[2])
} catch (err) {
  console.error('No se pudo guardar el último MEP/CCL:', err.message)
}

if (resultados.every((ok) => !ok)) process.exit(1)
