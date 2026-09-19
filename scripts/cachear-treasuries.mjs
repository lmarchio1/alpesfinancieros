// Corre vía GitHub Actions (ver .github/workflows/cachear-treasuries.yml) después del
// cierre de EE.UU. y guarda en Supabase la curva de rendimientos del Tesoro.
//
// El visitante nunca le pega a home.treasury.gov: lee la fila cacheada, que responde en
// ~0,4s contra los ~1,1s del Tesoro, y si el Tesoro se cae el sitio sigue mostrando el
// último dato bueno con su fecha. El front igual conserva el pedido directo como
// alternativa por si la cache falta (ver src/services/treasuryApi.js).
import { createClient } from '@supabase/supabase-js'
import { parsearCurva, urlDelMes } from '../src/utils/treasuryCurva.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FUENTE = 'treasury_curva'
// Suficiente para las tarjetas (hoy contra el día anterior), el gráfico de la curva
// comparada contra un mes atrás y la evolución del último mes y medio.
const DIAS_A_GUARDAR = 45

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

async function bajarMes(fecha) {
  const res = await fetch(urlDelMes(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1))
  if (!res.ok) throw new Error(`El Tesoro respondió ${res.status}`)
  return parsearCurva(await res.text())
}

function mesAnterior(fecha) {
  const d = new Date(fecha)
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() - 1)
  return d
}

async function main() {
  const hoy = new Date()
  // A principio de mes el archivo del mes corriente tiene pocos días, así que se suma el
  // mes anterior hasta juntar la ventana que necesita el sitio.
  let dias = await bajarMes(hoy)
  let mes = hoy
  while (dias.length < DIAS_A_GUARDAR) {
    mes = mesAnterior(mes)
    const previos = await bajarMes(mes)
    if (previos.length === 0) break
    dias = [...previos, ...dias]
  }
  dias = dias.slice(-DIAS_A_GUARDAR)

  if (dias.length === 0) {
    console.error('El Tesoro no devolvió ningún día: no se pisa lo que ya está cacheado.')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { error } = await supabase
    .from('precios_cache')
    .upsert({ fuente: FUENTE, datos: { dias }, actualizado_en: new Date().toISOString() }, { onConflict: 'fuente' })

  if (error) {
    console.error('Error al guardar en Supabase:', error.message)
    process.exit(1)
  }

  const ultimo = dias[dias.length - 1]
  console.log(`Guardados ${dias.length} días. Último: ${ultimo.fecha} — 3M ${ultimo.m3}% · 2A ${ultimo.a2}% · 10A ${ultimo.a10}% · 30A ${ultimo.a30}%`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
