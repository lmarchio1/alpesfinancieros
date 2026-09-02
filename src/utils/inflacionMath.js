// data: [{ fecha: 'YYYY-MM-DD', valor: %mensual }] ordenada ascendente.

function yearMonth(fecha) {
  return fecha.slice(0, 7) // 'YYYY-MM'
}

// Meses dentro del rango [desde, hasta] (ambos inclusive, formato 'YYYY-MM').
// Si no se pasa `hasta`, llega hasta el último dato disponible.
export function mesesEnRango(data, desdeYearMonth, hastaYearMonth) {
  return data.filter((d) => {
    const ym = yearMonth(d.fecha)
    if (ym < desdeYearMonth) return false
    if (hastaYearMonth && ym > hastaYearMonth) return false
    return true
  })
}

// Compuesto de inflación mensual entre dos meses (inclusive). Devuelve el factor
// multiplicativo, ej: 1.35 = +35% acumulado.
export function factorAcumulado(data, desdeYearMonth, hastaYearMonth) {
  return mesesEnRango(data, desdeYearMonth, hastaYearMonth).reduce(
    (factor, d) => factor * (1 + d.valor / 100),
    1
  )
}

// ¿Cuánto valen hoy $monto que tenías en el mes `desdeYearMonth`?
export function valorActualizado(data, monto, desdeYearMonth, hastaYearMonth) {
  return monto * factorAcumulado(data, desdeYearMonth, hastaYearMonth)
}

// Inflación interanual: acumulado de los últimos 12 meses con dato.
export function inflacionInteranual(data) {
  const ultimos12 = data.slice(-12)
  if (ultimos12.length < 12) return null
  const factor = ultimos12.reduce((acc, d) => acc * (1 + d.valor / 100), 1)
  return (factor - 1) * 100
}

// Serie histórica de inflación interanual (para el gráfico de tendencia de
// InflacionTab): la interanual de cada mes, calculada con los 12 meses previos a
// ese mes (inclusive) -mismo cálculo que inflacionInteranual, pero repetido mes a
// mes en vez de solo para el último dato-.
export function serieInteranual(data) {
  const resultado = []
  for (let i = 11; i < data.length; i++) {
    const factor = data.slice(i - 11, i + 1).reduce((acc, d) => acc * (1 + d.valor / 100), 1)
    resultado.push({ fecha: data[i].fecha, valor: (factor - 1) * 100 })
  }
  return resultado
}
