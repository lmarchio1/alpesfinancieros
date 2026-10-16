// Réplica del Índice Dólar (DXY de ICE): el dólar contra seis monedas, con los pesos fijos
// que ICE publica desde 1973. La fórmula pública es 50,14348112 × EURUSD^-0,576 × USDJPY^0,136 ×
// GBPUSD^-0,119 × USDCAD^0,091 × USDSEK^0,042 × USDCHF^0,036; como la fuente da todo
// en "unidades por dólar" (EUR por USD = 1 / EURUSD), los exponentes negativos quedan
// positivos. Comparado contra el índice real: 101,98 calculado contra 102,00 el
// 15/10/2026, y +3,5% en 12 meses en los dos.
//
// Lo usan el navegador (tarjeta de Divisas y Metales) y la tarea programada que arma la
// historia (scripts/cachear-dxy.mjs), así que no depende de nada del navegador.

export const DXY_PESOS = [
  { codigo: 'EUR', peso: 0.576 },
  { codigo: 'JPY', peso: 0.136 },
  { codigo: 'GBP', peso: 0.119 },
  { codigo: 'CAD', peso: 0.091 },
  { codigo: 'SEK', peso: 0.042 },
  { codigo: 'CHF', peso: 0.036 },
]
const DXY_CONSTANTE = 50.14348112

// Archivo diario de cotizaciones contra el dólar (el mismo que usa toda la pestaña). La
// versión con fecha es inmutable y jsdelivr la cachea de forma permanente.
export const urlCotizacionesDelDia = (fechaIso) =>
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${fechaIso}/v1/currencies/usd.json`

// El archivo más viejo que publica la fuente: antes de esta fecha no hay historia.
export const PRIMER_ARCHIVO = '2024-03-02'

// Si falta cualquiera de las seis, el índice no se puede calcular.
export function calcularDxy(rates) {
  let indice = DXY_CONSTANTE
  for (const { codigo, peso } of DXY_PESOS) {
    const porUsd = rates?.[codigo.toLowerCase()]
    if (typeof porUsd !== 'number' || !Number.isFinite(porUsd) || porUsd <= 0) return null
    indice *= porUsd ** peso
  }
  return indice
}

export function restarDias(fechaIso, dias) {
  const d = new Date(`${fechaIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - dias)
  return d.toISOString().slice(0, 10)
}

// El archivo de un día trae el cierre del día anterior (se publica a la medianoche UTC).
export const fechaDeCierre = (fechaArchivo) => restarDias(fechaArchivo, 1)

// Sábados y domingos el mercado está cerrado y el archivo repite el viernes: se omiten
// para que el gráfico no tenga escalones planos.
export const esFinDeSemana = (fechaIso) => [0, 6].includes(new Date(`${fechaIso}T00:00:00Z`).getUTCDay())

// Punto del gráfico a partir del archivo de un día, o null si no sirve.
export function puntoDelArchivo(fechaArchivo, archivo) {
  const fecha = fechaDeCierre(fechaArchivo)
  if (esFinDeSemana(fecha)) return null
  const valor = calcularDxy(archivo?.usd)
  return valor ? { fecha, valor: Number(valor.toFixed(3)) } : null
}
