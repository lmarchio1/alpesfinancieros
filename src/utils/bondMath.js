export function diasHasta(fechaISO) {
  const ms = new Date(fechaISO) - new Date()
  return Math.max(Math.ceil(ms / (1000 * 60 * 60 * 24)), 1)
}

// LECAP: "vpv" es el pago final pactado al emitirse (100 capitalizado a la
// TEM contractual), no el precio de hoy. El retorno real de comprar ahora
// sale de comparar ese pago final contra el precio de mercado actual.
export function retornoLetra(letra) {
  const dias = diasHasta(letra.fechaVencimiento)
  const retornoTotal = letra.vpv / letra.precioActual - 1
  return { retornoTotal, dias }
}

// Bono CER: la TIR publicada es real (por encima del CER). Para pasarla a
// retorno nominal en pesos hay que asumir una inflación esperada, ya que el
// capital se ajusta por CER hasta el vencimiento.
export function retornoBoncerNominal(bono, inflacionAnualEsperada) {
  const dias = diasHasta(bono.fechaVencimiento)
  const anios = dias / 365
  const factorCer = Math.pow(1 + inflacionAnualEsperada, anios)
  const factorReal = Math.pow(1 + bono.tirPorcentaje / 100, anios)
  const retornoTotal = factorCer * factorReal - 1
  return { retornoTotal, dias }
}

// Dólar al que hay que llegar al vencimiento para que ambas estrategias
// (quedarse en el instrumento en pesos vs. dolarizarse hoy) empaten.
export function calcularBreakeven({ retornoTotal, dolarSpot }) {
  const dolarBreakeven = dolarSpot * (1 + retornoTotal)
  const devaluacionImplicitaTotal = dolarBreakeven / dolarSpot - 1
  return { dolarBreakeven, devaluacionImplicitaTotal }
}

export function anualizar(retornoTotal, dias) {
  const anios = dias / 365
  if (anios <= 0) return 0
  return Math.pow(1 + retornoTotal, 1 / anios) - 1
}

// Aproximación estándar de duración modificada: %ΔPrecio ≈ -duración × Δrendimiento.
// Asume que el riesgo país se traslada ~1 a 1 al rendimiento exigido en dólares.
export function sensibilidadPrecio({ duracionAnios, deltaPuntosBasicos }) {
  const deltaYield = deltaPuntosBasicos / 10000
  return -duracionAnios * deltaYield
}
