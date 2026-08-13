// data: [{ fecha: 'YYYY-MM-DD', valor: %mensual }] ordenada ascendente.

function yearMonth(fecha) {
  return fecha.slice(0, 7) // 'YYYY-MM'
}

// Compuesto de inflación mensual desde un mes de origen (inclusive) hasta el último dato
// disponible. Devuelve el factor multiplicativo, ej: 1.35 = +35% acumulado.
export function factorAcumulado(data, desdeYearMonth) {
  return data
    .filter((d) => yearMonth(d.fecha) >= desdeYearMonth)
    .reduce((factor, d) => factor * (1 + d.valor / 100), 1)
}

// ¿Cuánto valen hoy $monto que tenías en el mes `desdeYearMonth` (formato 'YYYY-MM')?
export function valorActualizado(data, monto, desdeYearMonth) {
  return monto * factorAcumulado(data, desdeYearMonth)
}

// Inflación interanual: acumulado de los últimos 12 meses con dato.
export function inflacionInteranual(data) {
  const ultimos12 = data.slice(-12)
  if (ultimos12.length < 12) return null
  const factor = ultimos12.reduce((acc, d) => acc * (1 + d.valor / 100), 1)
  return (factor - 1) * 100
}
