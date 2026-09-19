// La curva de rendimientos que publica el Tesoro de EE.UU. viene en XML. El mismo
// análisis lo necesitan los dos lados -el script que la cachea en Supabase (Node) y el
// navegador, que la pide directo si la cache no está-, así que vive acá, sin depender
// de DOMParser ni de ninguna librería: el archivo es una lista regular de <entry> con
// un campo por plazo.

export const PLAZOS = [
  { clave: 'm1', campo: 'BC_1MONTH', etiqueta: '1 mes', anios: 1 / 12, corta: '1M' },
  { clave: 'm2', campo: 'BC_2MONTH', etiqueta: '2 meses', anios: 2 / 12, corta: '2M' },
  { clave: 'm3', campo: 'BC_3MONTH', etiqueta: '3 meses', anios: 0.25, corta: '3M' },
  { clave: 'm6', campo: 'BC_6MONTH', etiqueta: '6 meses', anios: 0.5, corta: '6M' },
  { clave: 'a1', campo: 'BC_1YEAR', etiqueta: '1 año', anios: 1, corta: '1A' },
  { clave: 'a2', campo: 'BC_2YEAR', etiqueta: '2 años', anios: 2, corta: '2A' },
  { clave: 'a3', campo: 'BC_3YEAR', etiqueta: '3 años', anios: 3, corta: '3A' },
  { clave: 'a5', campo: 'BC_5YEAR', etiqueta: '5 años', anios: 5, corta: '5A' },
  { clave: 'a7', campo: 'BC_7YEAR', etiqueta: '7 años', anios: 7, corta: '7A' },
  { clave: 'a10', campo: 'BC_10YEAR', etiqueta: '10 años', anios: 10, corta: '10A' },
  { clave: 'a20', campo: 'BC_20YEAR', etiqueta: '20 años', anios: 20, corta: '20A' },
  { clave: 'a30', campo: 'BC_30YEAR', etiqueta: '30 años', anios: 30, corta: '30A' },
]

const URL_BASE =
  'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve'

// Un mes por pedido: 20 KB contra los 272 KB que pesa el año entero.
export function urlDelMes(anio, mes) {
  return `${URL_BASE}&field_tdr_date_value_month=${anio}${String(mes).padStart(2, '0')}`
}

function valor(bloque, campo) {
  // El campo puede venir vacío (<d:BC_2MONTH m:null="true" />) en las fechas en que ese
  // plazo todavía no se licitaba.
  const crudo = new RegExp(`<d:${campo}[^>]*>([^<]*)</d:${campo}>`).exec(bloque)?.[1]
  const n = Number(crudo)
  return crudo !== undefined && crudo !== '' && Number.isFinite(n) ? n : null
}

// Devuelve una fila por día hábil, de la más vieja a la más nueva:
// { fecha: 'AAAA-MM-DD', m3: 4.14, a2: 4.76, ... }
export function parsearCurva(xml) {
  const dias = []
  for (const [, bloque] of String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const fecha = /<d:NEW_DATE[^>]*>([^<]{10})/.exec(bloque)?.[1]
    if (!fecha) continue
    const fila = { fecha }
    for (const { clave, campo } of PLAZOS) fila[clave] = valor(bloque, campo)
    // Una fila sin ningún rendimiento no aporta nada (el Tesoro no publica los feriados).
    if (PLAZOS.some(({ clave }) => fila[clave] !== null)) dias.push(fila)
  }
  return dias.sort((a, b) => a.fecha.localeCompare(b.fecha))
}
