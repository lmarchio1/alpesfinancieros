import { fetchPreciosCache } from './supabaseClient'
import { parsearCurva, parsearCurvaReal, serieBreakeven, unirCurvaReal, urlDelMes, urlRealDelMes } from '../utils/treasuryCurva'

// Curva de rendimientos del Tesoro de EE.UU. (par yield curve), el dato oficial contra
// el que se mide el riesgo país. Se publica una sola vez por día, después del cierre.
//
// Primero se lee la fila que deja cacheada el GitHub Action (ver
// scripts/cachear-treasuries.mjs): responde en ~0,4s contra los ~1,1s de
// home.treasury.gov, y aísla al visitante de que la fuente esté caída. Si no hay cache,
// se le pide directo al Tesoro, que también deja leerlo desde el navegador.
const FUENTE = 'treasury_curva'

// Una semana: el dato es diario, pero entre fin de semana largo y feriados de EE.UU. la
// última publicación puede quedar varios días atrás sin que eso signifique que algo
// falló. Más viejo que eso sí es señal de que el Action dejó de correr, y ahí conviene
// ir a la fuente.
const MAX_ANTIGUEDAD_MS = 7 * 24 * 60 * 60 * 1000

const DIAS_MINIMOS = 5

async function bajarMes(fecha) {
  const res = await fetch(urlDelMes(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1))
  if (!res.ok) throw new Error('No se pudo obtener la curva del Tesoro')
  return parsearCurva(await res.text())
}

// La curva real (TIPS) es opcional: si no responde, se muestra la curva igual y solo
// falta el breakeven de inflación.
async function bajarRealesDe(dias) {
  const meses = [...new Set(dias.map((d) => d.fecha.slice(0, 7)))]
  const lotes = await Promise.allSettled(
    meses.map(async (m) => {
      const res = await fetch(urlRealDelMes(Number(m.slice(0, 4)), Number(m.slice(5, 7))))
      if (!res.ok) throw new Error('No se pudo obtener la curva real del Tesoro')
      return parsearCurvaReal(await res.text())
    }),
  )
  return lotes.flatMap((l) => (l.status === 'fulfilled' ? l.value : []))
}

const conReal = (dias) => dias.some((d) => typeof d.real10 === 'number')

async function bajarDelTesoro() {
  const hoy = new Date()
  let dias = await bajarMes(hoy)
  // Los primeros días del mes el archivo trae una o dos fechas: se suma el mes anterior
  // para tener con qué comparar.
  if (dias.length < DIAS_MINIMOS) {
    const anterior = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 1))
    dias = [...(await bajarMes(anterior)), ...dias]
  }
  return dias
}

export async function fetchCurvaTreasury() {
  const cache = await fetchPreciosCache(FUENTE, MAX_ANTIGUEDAD_MS)
  let dias = Array.isArray(cache?.dias) && cache.dias.length > 0 ? cache.dias : await bajarDelTesoro()
  if (!dias || dias.length === 0) throw new Error('No se pudo obtener la curva del Tesoro')
  // La cache guardada antes de sumar el breakeven no trae la curva real: se completa acá
  // hasta que la tarea programada la vuelva a guardar con ese dato.
  if (!conReal(dias)) dias = unirCurvaReal(dias, await bajarRealesDe(dias))
  return { dias, desdeCache: Boolean(cache?.dias?.length) }
}

// Historia del breakeven para el gráfico de la tarjeta de inflación esperada. La arma la
// tarea programada (tres años, a partir de los archivos anuales del Tesoro, que tardan
// unos 20 segundos cada uno y por eso nunca los pide el navegador). Si esa fila no está,
// el gráfico se arma con los días que ya trae la curva, alrededor de dos meses.
const FUENTE_HISTORIA = 'breakeven_historia'

export async function fetchHistoriaBreakeven(diasDeLaCurva = []) {
  const cache = await fetchPreciosCache(FUENTE_HISTORIA, MAX_ANTIGUEDAD_MS)
  if (Array.isArray(cache?.puntos) && cache.puntos.length > 0) return { puntos: cache.puntos, completa: true }
  return { puntos: serieBreakeven(diasDeLaCurva), completa: false }
}
