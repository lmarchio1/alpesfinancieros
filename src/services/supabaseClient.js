import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// createClient tira una excepción sincrónica si falta la URL/key -pasó en producción:
// un build sin esas variables de entorno tumbaba TODA la página, no solo la sección que
// necesita Supabase-. Envuelto en try/catch para que, en el peor caso, se pierdan las
// comparaciones que dependen de Supabase pero el resto del sitio siga funcionando.
export const supabase = (() => {
  try {
    return createClient(supabaseUrl, supabaseKey)
  } catch (err) {
    console.error('No se pudo inicializar el cliente de Supabase:', err.message)
    return null
  }
})()

function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

function fechaArgentinaAyer() {
  const hoy = fechaArgentinaHoy()
  const d = new Date(`${hoy}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Cierre de cada instrumento capturado a las 00hs ART por un GitHub Action (ver
// .github/workflows/cierre-diario.yml y scripts/capturar-cierre-diario.mjs) y guardado
// en Supabase: un único valor, igual para todos los visitantes sin importar cuándo
// entren -a diferencia del respaldo por localStorage que se usaba antes, que podía
// quedar distinto entre navegadores según el momento en que cada uno cargó la página-.
export async function fetchCierresDeAyer(instrumentos) {
  if (!supabase) return {}
  const { data, error } = await supabase
    .from('cierres_diarios')
    .select('instrumento, valor')
    .eq('fecha', fechaArgentinaAyer())
    .in('instrumento', instrumentos)

  if (error || !data) return {}
  return Object.fromEntries(data.map((r) => [r.instrumento, r.valor]))
}

const CACHE_MAX_ANTIGUEDAD_MS = 30 * 60 * 1000 // 30 minutos

// Respuesta cruda de una fuente externa (data912, etc.), cacheada periódicamente por un
// GitHub Action (ver scripts/cachear-precios.mjs) para no depender de esa fuente en cada
// apertura de pestaña. Si no hay fila, o está más vieja que el techo de frescura (el
// Action dejó de correr, o Supabase no responde), devuelve null: el que llama cae al
// fetch directo de siempre.
export async function fetchPreciosCache(fuente) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('precios_cache')
      .select('datos, actualizado_en')
      .eq('fuente', fuente)
      .single()

    if (error || !data) return null
    const antiguedad = Date.now() - new Date(data.actualizado_en).getTime()
    if (antiguedad > CACHE_MAX_ANTIGUEDAD_MS) return null

    return data.datos
  } catch {
    return null
  }
}
