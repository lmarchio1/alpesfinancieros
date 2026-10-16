// Corre en la tarea de cierre diario (ver .github/workflows/cierre-diario.yml): arma la
// historia del Índice Dólar (DXY) para el gráfico de la tarjeta de Divisas y Metales y la
// guarda en Supabase. El visitante baja solo esa fila (~30 KB), y recién cuando abre el
// gráfico.
//
// No hay una fuente gratuita y oficial con la serie del DXY, así que se calcula día por día
// con la fórmula de ICE a partir del archivo diario de cotizaciones que ya usa el sitio
// (ver src/utils/dxy.js). Es incremental: lee lo guardado y pide solo los días que faltan,
// así que la primera corrida baja unos 950 archivos (desde marzo de 2024, el primero que
// publica la fuente) y las siguientes uno o dos por noche.
//
// Si algo falla, no se pisa lo guardado: el gráfico sigue mostrando la última versión buena.
//
// Prueba local sin tocar Supabase: DRY_RUN=1 node scripts/cachear-dxy.mjs
import {
  PRIMER_ARCHIVO,
  esFinDeSemana,
  fechaDeCierre,
  puntoDelArchivo,
  restarDias,
  urlCotizacionesDelDia,
} from '../src/utils/dxy.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DRY_RUN = process.env.DRY_RUN === '1'
const FUENTE = 'dxy_historia'
// Hasta 4 años, como el resto de los gráficos (hoy la fuente llega a unos 2 años y medio).
const DIAS_DE_HISTORIA = 4 * 365
// Pedidos simultáneos a jsdelivr en la primera corrida.
const EN_PARALELO = 8
// Más de dos años de ruedas son ~500 días: menos que esto es señal de que algo vino roto.
const MINIMO_ESPERADO = 400

if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

async function leerGuardado(supabase) {
  if (!supabase) return []
  const { data, error } = await supabase.from('precios_cache').select('datos').eq('fuente', FUENTE).maybeSingle()
  if (error) throw new Error(`Error al leer Supabase: ${error.message}`)
  return Array.isArray(data?.datos?.puntos) ? data.datos.puntos : []
}

// Devuelve el punto del día o null si el archivo no está (todavía no se publicó, o la
// fuente salteó ese día) o no trae las seis monedas.
async function bajarPunto(fechaArchivo) {
  try {
    const res = await fetch(urlCotizacionesDelDia(fechaArchivo))
    if (!res.ok) return null
    return puntoDelArchivo(fechaArchivo, await res.json())
  } catch {
    return null
  }
}

async function bajarEnTandas(fechas) {
  const puntos = []
  for (let i = 0; i < fechas.length; i += EN_PARALELO) {
    const tanda = await Promise.all(fechas.slice(i, i + EN_PARALELO).map(bajarPunto))
    puntos.push(...tanda.filter(Boolean))
  }
  return puntos
}

async function main() {
  const { createClient } = DRY_RUN ? {} : await import('@supabase/supabase-js')
  const supabase = DRY_RUN ? null : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const hoy = new Date().toISOString().slice(0, 10)
  const desde = [PRIMER_ARCHIVO, restarDias(hoy, DIAS_DE_HISTORIA)].sort().at(-1)
  const guardado = await leerGuardado(supabase)
  const yaEstan = new Set(guardado.map((p) => p.fecha))

  // Archivos que faltan: uno por día, salvo los que traen el cierre de un fin de semana.
  const pendientes = []
  for (let f = desde; f <= hoy; f = restarDias(f, -1)) {
    const cierre = fechaDeCierre(f)
    if (!esFinDeSemana(cierre) && !yaEstan.has(cierre)) pendientes.push(f)
  }

  const nuevos = await bajarEnTandas(pendientes)
  const porFecha = new Map(guardado.map((p) => [p.fecha, p]))
  for (const p of nuevos) porFecha.set(p.fecha, p)
  const limite = restarDias(hoy, DIAS_DE_HISTORIA)
  const puntos = [...porFecha.values()].filter((p) => p.fecha >= limite).sort((a, b) => a.fecha.localeCompare(b.fecha))

  if (puntos.length < MINIMO_ESPERADO) {
    throw new Error(`La historia quedó con ${puntos.length} días: no se pisa lo que ya está guardado.`)
  }

  const ultimo = puntos.at(-1)
  const resumen = `Historia del DXY: ${puntos.length} días (${nuevos.length} nuevos de ${pendientes.length} pedidos), del ${puntos[0].fecha} al ${ultimo.fecha} (último ${ultimo.valor.toFixed(2)}).`

  if (DRY_RUN) {
    console.log(`[prueba, no se guardó nada] ${resumen}`)
    if (process.env.SALIDA) {
      const { writeFileSync } = await import('node:fs')
      writeFileSync(process.env.SALIDA, JSON.stringify({ puntos }))
    }
    return
  }

  if (nuevos.length === 0 && guardado.length === puntos.length) {
    console.log(`Sin días nuevos. ${resumen}`)
    return
  }

  const { error } = await supabase
    .from('precios_cache')
    .upsert({ fuente: FUENTE, datos: { puntos }, actualizado_en: new Date().toISOString() }, { onConflict: 'fuente' })
  if (error) throw new Error(`Error al guardar en Supabase: ${error.message}`)
  console.log(resumen)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
