import { fetchPreciosCache } from './supabaseClient'

// Tipo de cambio real multilateral del BCRA. Lo guarda la tarea nocturna (ver
// scripts/cachear-itcrm.mjs): el BCRA lo publica solo como un Excel que el navegador no
// puede leer, así que acá no hay pedido directo de respaldo. Si la fila no está, la
// tarjeta no se muestra.
//
// La fila se reescribe cada noche, pero el dato puede tener días: el BCRA no lo actualiza
// a diario. La tarjeta muestra la fecha del último dato; se deja de mostrar recién si la
// tarea lleva más de 45 días sin poder guardarlo.
const ANTIGUEDAD_MAXIMA_MS = 45 * 24 * 60 * 60 * 1000

// Mismo rango posible que valida la tarea nocturna.
const VALOR_MINIMO = 20
const VALOR_MAXIMO = 500

// Un dato sirve solo si tiene fecha AAAA-MM-DD y un valor dentro del rango posible.
function punto(p) {
  if (!p || typeof p.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.fecha)) return null
  const valor = typeof p.valor === 'number' ? p.valor : Number.NaN
  if (!Number.isFinite(valor) || valor < VALOR_MINIMO || valor > VALOR_MAXIMO) return null
  return { fecha: p.fecha, valor }
}

// Todo lo que llega a la tarjeta pasa por acá, venga de la base o de lo guardado en el
// navegador de una visita anterior: si falta el dato principal devuelve null (la tarjeta
// no se dibuja) y si falta o viene mal algo secundario, solo se omite esa parte. Así un
// cambio en el Excel del BCRA o en la tarea nunca puede romper la página.
export function normalizarItcrm(resumen) {
  const ultimo = punto(resumen?.ultimo)
  if (!ultimo) return null
  const promedio = resumen.promedioHistorico
  const minimo = punto(resumen.minimo)
  const maximo = punto(resumen.maximo)
  const extremosValidos = minimo && maximo && maximo.valor > minimo.valor
  return {
    ultimo,
    haceUnMes: punto(resumen.haceUnMes),
    haceUnAnio: punto(resumen.haceUnAnio),
    promedioHistorico:
      typeof promedio === 'number' && Number.isFinite(promedio) && promedio >= VALOR_MINIMO && promedio <= VALOR_MAXIMO
        ? promedio
        : null,
    minimo: extremosValidos ? minimo : null,
    maximo: extremosValidos ? maximo : null,
    desde: typeof resumen.desde === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(resumen.desde) ? resumen.desde : null,
  }
}

// Solo en localhost: el resultado de correr el script en modo prueba, para ver la tarjeta
// antes de que exista la fila. En el sitio publicado esto ni siquiera se incluye.
async function datosDeDesarrollo() {
  if (!import.meta.env.DEV) return null
  try {
    const res = await fetch('/itcrm-dev.json')
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

export async function fetchItcrm() {
  const crudo = (await fetchPreciosCache('itcrm', ANTIGUEDAD_MAXIMA_MS)) ?? (await datosDeDesarrollo())?.resumen
  const resumen = normalizarItcrm(crudo)
  if (!resumen) throw new Error('No se pudo obtener el tipo de cambio real multilateral')
  return resumen
}

export async function fetchHistoriaItcrm() {
  const historia = (await fetchPreciosCache('itcrm_historia', ANTIGUEDAD_MAXIMA_MS)) ?? (await datosDeDesarrollo())
  // Solo puntos válidos, sin fechas repetidas y en orden: un punto roto dibujaría una línea
  // rota sin avisar.
  const puntos = Array.isArray(historia?.puntos) ? historia.puntos.map(punto).filter(Boolean) : []
  const unicos = [...new Map(puntos.map((p) => [p.fecha, p])).values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
  if (unicos.length < 2) throw new Error('No se pudo obtener la historia del tipo de cambio real multilateral')
  return { puntos: unicos, completa: true }
}
