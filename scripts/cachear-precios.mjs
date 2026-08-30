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

const resultados = await Promise.all([
  cachear('data912_arg_bonds', 'https://data912.com/live/arg_bonds'),
  cachear('data912_arg_notes', 'https://data912.com/live/arg_notes'),
  cachear('data912_ccl', 'https://data912.com/live/ccl'),
])

if (resultados.every((ok) => !ok)) process.exit(1)
