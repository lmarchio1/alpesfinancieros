// Corre vía GitHub Actions (ver .github/workflows/cachear-treasuries.yml) después del
// cierre de EE.UU. y guarda en Supabase la curva de rendimientos del Tesoro, con el
// rendimiento real a 10 años (TIPS) de cada día para calcular el breakeven de inflación.
//
// El visitante nunca le pega a home.treasury.gov: lee la fila cacheada, que responde en
// ~0,4s contra los ~1,1s del Tesoro, y si el Tesoro se cae el sitio sigue mostrando el
// último dato bueno con su fecha. El front igual conserva el pedido directo como
// alternativa por si la cache falta (ver src/services/treasuryApi.js).
import { createClient } from '@supabase/supabase-js'
import {
  parsearCurva,
  parsearCurvaReal,
  serieBreakeven,
  unirCurvaReal,
  urlDelAnio,
  urlDelMes,
  urlRealDelAnio,
  urlRealDelMes,
} from '../src/utils/treasuryCurva.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FUENTE = 'treasury_curva'
// Historia del breakeven para el gráfico de la tarjeta de inflación esperada: va en su
// propia fila para que la pestaña no la baje hasta que alguien abre ese gráfico.
const FUENTE_HISTORIA = 'breakeven_historia'
// Tres años calendario: así el rango de "2 años" del gráfico siempre está completo.
const ANIOS_DE_HISTORIA = 3
// Suficiente para las tarjetas (hoy contra el día anterior), el gráfico de la curva
// comparada contra un mes atrás y la evolución del último mes y medio.
const DIAS_A_GUARDAR = 45

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

async function texto(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`El Tesoro respondió ${res.status}`)
  return res.text()
}

// La curva real es un agregado: si ese archivo falla, se guarda la nominal igual y solo
// falta el breakeven ese día.
async function bajarMes(fecha) {
  const anio = fecha.getUTCFullYear()
  const mes = fecha.getUTCMonth() + 1
  const [nominal, real] = await Promise.allSettled([texto(urlDelMes(anio, mes)), texto(urlRealDelMes(anio, mes))])
  if (nominal.status === 'rejected') throw nominal.reason
  if (real.status === 'rejected') console.warn(`Sin curva real para ${anio}-${mes}: ${real.reason.message}`)
  const dias = parsearCurva(nominal.value)
  return real.status === 'fulfilled' ? unirCurvaReal(dias, parsearCurvaReal(real.value)) : dias
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
  const breakeven = typeof ultimo.real10 === 'number' ? ` · breakeven 10A ${(ultimo.a10 - ultimo.real10).toFixed(2)}%` : ''
  console.log(`Guardados ${dias.length} días. Último: ${ultimo.fecha} — 3M ${ultimo.m3}% · 2A ${ultimo.a2}% · 10A ${ultimo.a10}% · 30A ${ultimo.a30}%${breakeven}`)

  // La historia es un agregado: si falla, la curva ya quedó guardada y el gráfico sigue
  // mostrando la última versión buena.
  try {
    await cachearHistoria(supabase, hoy)
  } catch (err) {
    console.warn(`No se pudo actualizar la historia del breakeven: ${err.message}`)
  }
}

async function cachearHistoria(supabase, hoy) {
  const anios = Array.from({ length: ANIOS_DE_HISTORIA }, (_, i) => hoy.getUTCFullYear() - ANIOS_DE_HISTORIA + 1 + i)
  const dias = []
  for (const anio of anios) {
    const [nominal, real] = await Promise.all([texto(urlDelAnio(anio)), texto(urlRealDelAnio(anio))])
    dias.push(...unirCurvaReal(parsearCurva(nominal), parsearCurvaReal(real)))
  }
  const puntos = serieBreakeven(dias)
  if (puntos.length < 20) throw new Error(`la historia vino casi vacía (${puntos.length} días)`)

  const { error } = await supabase
    .from('precios_cache')
    .upsert({ fuente: FUENTE_HISTORIA, datos: { puntos }, actualizado_en: new Date().toISOString() }, { onConflict: 'fuente' })
  if (error) throw new Error(error.message)
  console.log(`Historia del breakeven: ${puntos.length} días, del ${puntos[0].fecha} al ${puntos.at(-1).fecha}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
