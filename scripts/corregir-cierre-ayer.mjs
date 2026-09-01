// Uso único: la corrida legítima de hoy (05:38 ART) usó el código viejo (previo al fix
// de desfasaje de fecha) y guardó el cierre real de ayer bajo la fecha de HOY por
// error. La prueba manual de esta noche, ya con el fix aplicado, calculó bien "ayer"
// pero pisó esa fila con precios de mitad de rueda en vez del cierre real. Este script
// copia los valores de la fila mal etiquetada (fecha=HOY) a la fecha correcta (ayer),
// restaurando el cierre real como base de comparación. Se borra después de usarlo.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const FECHA_ORIGEN = '2026-09-01' // donde quedó mal etiquetado el cierre real de ayer
const FECHA_DESTINO = '2026-08-31' // fecha correcta

const { data, error } = await supabase
  .from('cierres_diarios')
  .select('instrumento, valor')
  .eq('fecha', FECHA_ORIGEN)

if (error) {
  console.error('Error al leer:', error.message)
  process.exit(1)
}

console.log(`Leídos ${data.length} instrumentos de fecha=${FECHA_ORIGEN}`)

const registros = data.map((r) => ({ fecha: FECHA_DESTINO, instrumento: r.instrumento, valor: r.valor }))
const { error: errorEscritura } = await supabase
  .from('cierres_diarios')
  .upsert(registros, { onConflict: 'fecha,instrumento' })

if (errorEscritura) {
  console.error('Error al escribir:', errorEscritura.message)
  process.exit(1)
}

console.log(`Corregido: ${registros.length} instrumentos restaurados en fecha=${FECHA_DESTINO}`)
