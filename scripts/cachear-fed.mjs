// Corre en la tarea de cierre diario (ver .github/workflows/cierre-diario.yml): baja de la
// API oficial de la Fed de Nueva York los últimos 4 años de la tasa de fondos federales y
// guarda dos filas en Supabase:
//   - fed_tasa: el último dato y la lista de cambios de rango (unas pocas líneas), que es
//     lo que lee la tarjeta al abrir la pestaña.
//   - fed_historia: la tasa efectiva día por día (~35 KB), que se baja recién cuando
//     alguien abre el gráfico, en vez de los ~290 KB que devuelve la API.
//
// Si la fuente falla o viene rara, no se pisa lo guardado.
//
// Prueba local sin tocar Supabase: DRY_RUN=1 node scripts/cachear-fed.mjs
import { cambiosDeRango, parsearTasasFed, restarDiasFed, urlTasaFedEntre } from '../src/utils/fed.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DRY_RUN = process.env.DRY_RUN === '1'
const DIAS_DE_HISTORIA = 4 * 365
// Cuatro años de ruedas son ~1.000 días: menos que esto es señal de respuesta rota.
const MINIMO_ESPERADO = 500

if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

async function main() {
  const hoy = new Date().toISOString().slice(0, 10)
  const res = await fetch(urlTasaFedEntre(restarDiasFed(hoy, DIAS_DE_HISTORIA), hoy))
  if (!res.ok) throw new Error(`La Fed de Nueva York respondió ${res.status}`)
  const dias = parsearTasasFed(await res.json())

  if (dias.length < MINIMO_ESPERADO) {
    throw new Error(`La historia vino con ${dias.length} días: no se pisa lo que ya está guardado.`)
  }

  const ultimo = dias.at(-1)
  const cambios = cambiosDeRango(dias)
  const resumen = { ultimo, cambios }
  const historia = { puntos: dias.map((d) => ({ fecha: d.fecha, valor: d.efectiva })) }
  const texto = `Tasa de la Fed: ${dias.length} días, del ${dias[0].fecha} al ${ultimo.fecha}. Rango ${ultimo.desde}–${ultimo.hasta}%, efectiva ${ultimo.efectiva}%, ${cambios.length - 1} cambios de rango.`

  if (DRY_RUN) {
    console.log(`[prueba, no se guardó nada] ${texto}`)
    console.log(cambios.map((c) => `  ${c.fecha}: ${c.desde}–${c.hasta}%`).join('\n'))
    return
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const actualizado_en = new Date().toISOString()
  const { error } = await supabase.from('precios_cache').upsert(
    [
      { fuente: 'fed_tasa', datos: resumen, actualizado_en },
      { fuente: 'fed_historia', datos: historia, actualizado_en },
    ],
    { onConflict: 'fuente' },
  )
  if (error) throw new Error(`Error al guardar en Supabase: ${error.message}`)
  console.log(texto)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
