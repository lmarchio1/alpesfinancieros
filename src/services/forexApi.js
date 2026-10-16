import { fetchPreciosCache } from './supabaseClient'
import { calcularDxy, fechaDeCierre, restarDias, urlCotizacionesDelDia } from '../utils/dxy'

const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api'

const MONEDAS = ['EUR', 'GBP', 'BRL', 'CLP', 'COP', 'UYU']
// La misma API expone metales preciosos como si fueran "monedas" (XAU =
// onza de oro, etc.), así que se resuelven con el mismo fetch de usd.json,
// sin ningún llamado ni dependencia extra.
const METALES = ['XAU', 'XAG', 'XPT']

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudieron obtener las cotizaciones')
  return res.json()
}

// @latest resuelve a la publicación más nueva -confirmado en vivo-, pero
// jsdelivr la sirve desde su CDN de borde con Cache-Control: s-maxage=43200
// (12hs) e IGNORA POR COMPLETO el query string para decidir qué devolver
// -confirmado pidiendo la misma URL con dos cache-busters distintos: llegó
// el mismo header Age en los dos, o sea la misma respuesta cacheada-. Ningún
// truco de cache-busting del lado del cliente puede evitar ese caché de
// borde, así que @latest no sirve como fuente primaria para "hoy".
//
// En cambio, la URL con fecha exacta (@YYYY-MM-DD) apunta a una versión
// específica e inmutable del paquete, que jsdelivr cachea de forma estable
// y correcta una vez publicada. Por eso ahora se pide esa primero, y solo
// se cae a @latest si la fecha de hoy todavía no se publicó (404).
function fetchUsdRatesFecha(fecha) {
  return fetchJson(urlCotizacionesDelDia(fecha))
}

function fetchUsdRatesLatest(cacheBuster) {
  return fetchJson(`${BASE_URL}@latest/v1/currencies/usd.json?_=${cacheBuster}`)
}

function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

async function fetchUsdRatesHoy() {
  try {
    return await fetchUsdRatesFecha(fechaArgentinaHoy())
  } catch {
    return fetchUsdRatesLatest(Date.now())
  }
}

function diaAnterior(fechaIso) {
  const d = new Date(`${fechaIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// La fuente no siempre publica todas las monedas: el 18/09/2026 el archivo del día
// salió con 301 claves en vez de 340 y le faltaban, entre otras, el platino (XPT) y el
// paladio. Con `1 / undefined` eso daba NaN y la tarjeta mostraba "USD NaN", así que
// cada cotización se valida acá: si la fuente no la publicó, se devuelve null y la
// tarjeta no se dibuja, sin afectar al resto.
function tasa(rates, codigo) {
  const valor = rates?.[codigo.toLowerCase()]
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : null
}

// DXY de una fecha pasada, para saber si el dólar está más fuerte o más débil que antes.
// Si ese día justo no se publicó el archivo, prueba con los anteriores.
async function dxyEnFecha(fechaIso) {
  for (let i = 0; i < 4; i++) {
    try {
      const archivo = await fetchUsdRatesFecha(restarDias(fechaIso, i))
      const valor = calcularDxy(archivo.usd)
      if (valor) return valor
    } catch {
      // Sigue con el día anterior.
    }
  }
  return null
}

// Variación del DXY contra hace un mes y hace un año. Son dos archivos chicos, con fecha
// fija, que jsdelivr cachea de forma permanente; si no llegan, la tarjeta se muestra igual
// sin la comparación.
async function comparacionesDxy(fechaHoy, valorHoy) {
  const [mes, anio] = await Promise.all([dxyEnFecha(restarDias(fechaHoy, 30)), dxyEnFecha(restarDias(fechaHoy, 365))])
  const variacion = (antes) => (antes ? ((valorHoy - antes) / antes) * 100 : null)
  return { variacionMesPct: variacion(mes), variacionAnioPct: variacion(anio) }
}

export async function fetchOtrasMonedas() {
  const hoy = await fetchUsdRatesHoy()
  const dxyHoy = calcularDxy(hoy.usd)
  // Arranca en paralelo con el archivo de ayer, así no suma espera.
  const comparaciones = dxyHoy ? comparacionesDxy(hoy.date, dxyHoy).catch(() => ({})) : Promise.resolve({})

  let ayer = null
  try {
    ayer = await fetchUsdRatesFecha(diaAnterior(hoy.date))
  } catch {
    ayer = null
  }

  // Sin el peso no hay nada que mostrar: se trata como una respuesta inservible, así el
  // hook conserva el último dato bueno en vez de reemplazarlo por tarjetas vacías.
  const arsPorUsd = tasa(hoy.usd, 'ars')
  if (!arsPorUsd) throw new Error('No se pudieron obtener las cotizaciones')

  const cotizaciones = MONEDAS.map((codigo) => {
    const porUsd = tasa(hoy.usd, codigo)
    if (!porUsd) return null
    const porUsdAyer = tasa(ayer?.usd, codigo)
    const usdPorUnidad = 1 / porUsd
    const usdPorUnidadAyer = porUsdAyer ? 1 / porUsdAyer : null

    return {
      codigo,
      usd: usdPorUnidad,
      ars: usdPorUnidad * arsPorUsd,
      porUsd,
      // Variación de la moneda contra el dólar (ej. cuánto se movió el EUR).
      variacionPct: usdPorUnidadAyer ? ((usdPorUnidad - usdPorUnidadAyer) / usdPorUnidadAyer) * 100 : null,
      // Variación inversa (cuánto se movió el USD medido en esa moneda): no es
      // simplemente el signo opuesto de variacionPct, es la variación propia
      // de porUsd, para que la vista "US$ → Moneda" muestre el signo correcto.
      variacionPctInverso: porUsdAyer ? ((porUsd - porUsdAyer) / porUsdAyer) * 100 : null,
    }
  }).filter(Boolean)

  const metales = METALES.map((codigo) => {
    const porOnza = tasa(hoy.usd, codigo)
    if (!porOnza) return null
    const porOnzaAyer = tasa(ayer?.usd, codigo)
    const usdPorOnza = 1 / porOnza
    const usdPorOnzaAyer = porOnzaAyer ? 1 / porOnzaAyer : null

    return {
      codigo,
      usd: usdPorOnza,
      ars: usdPorOnza * arsPorUsd,
      variacionPct: usdPorOnzaAyer ? ((usdPorOnza - usdPorOnzaAyer) / usdPorOnzaAyer) * 100 : null,
    }
  }).filter(Boolean)

  if (cotizaciones.length === 0 && metales.length === 0) {
    throw new Error('No se pudieron obtener las cotizaciones')
  }

  const dxyAyer = calcularDxy(ayer?.usd)
  const dxy = dxyHoy
    ? {
        valor: dxyHoy,
        variacionPct: dxyAyer ? ((dxyHoy - dxyAyer) / dxyAyer) * 100 : null,
        ...(await comparaciones),
      }
    : null

  return { cotizaciones, metales, dxy, fecha: hoy.date }
}

// Historia del DXY para el gráfico de la tarjeta. La arma la tarea de cierre diario (ver
// scripts/cachear-dxy.mjs), que calcula el índice día por día desde el primer archivo de
// la fuente (marzo de 2024) y lo guarda en Supabase: el visitante baja solo esa fila, y
// recién cuando abre el gráfico. Si la fila no está, se arma acá una versión liviana: un
// punto por semana de los últimos seis meses, 26 archivos chicos pedidos en paralelo.
const FUENTE_HISTORIA_DXY = 'dxy_historia'
const SEMANAS_DE_RESPALDO = 26

async function historiaDxyDeRespaldo() {
  const hoy = new Date().toISOString().slice(0, 10)
  const fechas = Array.from({ length: SEMANAS_DE_RESPALDO }, (_, i) => restarDias(hoy, 7 * i + 1))
  const archivos = await Promise.allSettled(fechas.map((f) => fetchUsdRatesFecha(f)))
  return archivos
    .map((a, i) => {
      const valor = a.status === 'fulfilled' ? calcularDxy(a.value?.usd) : null
      return valor ? { fecha: fechaDeCierre(fechas[i]), valor: Number(valor.toFixed(3)) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export async function fetchHistoriaDxy() {
  const cache = await fetchPreciosCache(FUENTE_HISTORIA_DXY, 7 * 24 * 60 * 60 * 1000)
  if (Array.isArray(cache?.puntos) && cache.puntos.length > 0) return { puntos: cache.puntos, completa: true }
  const puntos = await historiaDxyDeRespaldo()
  if (puntos.length < 2) throw new Error('No se pudo obtener la historia del índice dólar')
  return { puntos, completa: false }
}
