// Corre en la tarea de cierre diario (ver .github/workflows/cierre-diario.yml): baja la
// serie completa del riesgo país, se queda con los últimos 4 años y la guarda en
// Supabase para el gráfico de la tarjeta. El visitante lee solo ese recorte (~34 KB) y
// recién cuando abre el gráfico, en vez de bajar los ~400 KB de la serie entera.
//
// Si la fuente falla o cambia de formato, no se pisa lo guardado: el gráfico sigue
// mostrando la última versión buena.
import { createClient } from '@supabase/supabase-js'
import { URL_HISTORIA_RIESGO_PAIS, recortarHistoria } from '../src/utils/riesgoPaisHistoria.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FUENTE = 'riesgo_pais_historia'

// Cuatro años de ruedas son ~1.000 días hábiles: menos que esto es señal de que la
// respuesta vino rota o con otro formato.
const MINIMO_ESPERADO = 500

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

async function main() {
  const res = await fetch(`${URL_HISTORIA_RIESGO_PAIS}?_=${Date.now()}`)
  if (!res.ok) throw new Error(`argentinadatos respondió ${res.status}`)
  const puntos = recortarHistoria(await res.json())

  if (puntos.length < MINIMO_ESPERADO) {
    throw new Error(`La historia vino con ${puntos.length} días: no se pisa lo que ya está guardado.`)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { error } = await supabase
    .from('precios_cache')
    .upsert({ fuente: FUENTE, datos: { puntos }, actualizado_en: new Date().toISOString() }, { onConflict: 'fuente' })
  if (error) throw new Error(`Error al guardar en Supabase: ${error.message}`)

  const ultimo = puntos.at(-1)
  console.log(`Historia del riesgo país: ${puntos.length} días, del ${puntos[0].fecha} al ${ultimo.fecha} (último ${ultimo.valor} pb).`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
