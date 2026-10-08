// Historia del riesgo país para su gráfico de evolución. La fuente (argentinadatos) no
// deja pedir un rango de fechas: siempre devuelve la serie entera desde 1999, ~7.700
// registros y ~400 KB, para mostrar solo los últimos 4 años (~1.270 días, ~34 KB). Por
// eso la recorta la tarea programada (scripts/cachear-riesgo-pais.mjs) y el navegador
// lee solo el recorte. Lo usan los dos lados, así que no depende del navegador.

export const URL_HISTORIA_RIESGO_PAIS = 'https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais'

// Cuatro años, como el resto de los gráficos históricos del sitio.
export const ANIOS_HISTORIA_RIESGO_PAIS = 4

export function recortarHistoria(registros, anios = ANIOS_HISTORIA_RIESGO_PAIS, hoy = new Date()) {
  const corte = new Date(hoy)
  corte.setUTCFullYear(corte.getUTCFullYear() - anios)
  const corteIso = corte.toISOString().slice(0, 10)

  // Un valor por día: si la fuente repite una fecha, queda el último registro.
  const porFecha = new Map()
  for (const r of Array.isArray(registros) ? registros : []) {
    const fecha = typeof r?.fecha === 'string' ? r.fecha.slice(0, 10) : null
    const valor = Number(r?.valor)
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(valor) || fecha < corteIso) continue
    porFecha.set(fecha, valor)
  }
  return [...porFecha]
    .map(([fecha, valor]) => ({ fecha, valor }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}
