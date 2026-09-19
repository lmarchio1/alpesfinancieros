import { fetchPreciosCache } from './supabaseClient'
import { parsearCurva, urlDelMes } from '../utils/treasuryCurva'

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
  const dias = Array.isArray(cache?.dias) && cache.dias.length > 0 ? cache.dias : await bajarDelTesoro()
  if (!dias || dias.length === 0) throw new Error('No se pudo obtener la curva del Tesoro')
  return { dias, desdeCache: Boolean(cache?.dias?.length) }
}
