// Clasificación de los tickers de data912 en las solapas de "Renta Fija Soberana",
// compartida por el detector de bonos nuevos (detectar-bonos-nuevos.mjs) y por el
// que aplica la respuesta del mail (aplicar-respuesta-bono.mjs).
//
// Reglas por inicial, tal como las definió el usuario:
//   LECAP S · TAMAR TM · BONCAP T+fecha · BONCER TZX/TX · BOPREAL BP · BONARES A · GLOBALES GD
//
// Lo que las iniciales solas no resuelven, y por eso esto AVISA en vez de agregar solo:
// - data912 lista cada bono varias veces: sin sufijo (pesos), "C" (cable) y "D" (MEP), y
//   para las versiones en dólares BYMA acorta el nombre (TZXD6 -> TXD6D, TZX27 -> TZX7D,
//   TMF27 -> TMF7D). BOPREAL, Globales y Bonares se muestran en MEP; el resto en pesos,
//   así que de cada categoría se mira solo la versión que muestra el sitio. Los "BPO..."
//   son los BOPREAL cotizados en pesos.
// - Hay duales con las mismas iniciales que una categoría: TT... y TXM... se descartan
//   siempre; los que no se reconocen por la inicial (TMVE8, TZXJ0) viven en
//   bonos-ignorados.json, que crece cada vez que el usuario responde "no".

export const CATEGORIAS = {
  BONCAP: { mapa: 'BONCAP_META', etiqueta: 'Boncap' },
  TAMAR: { mapa: 'TAMAR_META', etiqueta: 'Tamar' },
  BONCER: { mapa: 'BONCER_META', etiqueta: 'Boncer' },
  BOPREAL: { mapa: 'BOPREAL_META', etiqueta: 'Bopreal', extra: { ley: 'ARG' } },
  // Estos dos necesitan además la duración (la usa la calculadora de sensibilidad al
  // riesgo país), un dato que no se puede pedir con una respuesta de una línea.
  GLOBALES: { mapa: 'MATURITY_BY_YEAR', etiqueta: 'Globales', manual: true },
  BONARES: { mapa: 'BONARES_NUEVOS_META', etiqueta: 'Bonares', manual: true },
}

const PREFIJOS_DUALES = ['TT', 'TXM']

// Devuelve { categoria, clave } o null. "clave" es como iría escrito en el mapa de
// bondsReference.js (BOPREAL lleva la D; el resto, el ticker en pesos).
export function clasificar(simbolo) {
  const enDolares = simbolo.endsWith('D')
  const terminaEnDigito = /\d$/.test(simbolo)

  if (enDolares) {
    if (/^GD\d{2}D$/.test(simbolo)) return { categoria: 'GLOBALES', clave: simbolo }
    if (/^A[A-Z]\d{2}D$/.test(simbolo)) return { categoria: 'BONARES', clave: simbolo }
    if (/^BP(?!O)[A-Z0-9]+D$/.test(simbolo)) return { categoria: 'BOPREAL', clave: simbolo }
    return null // versión en dólares de un bono en pesos: el sitio ya muestra la de pesos
  }
  if (!terminaEnDigito) return null // cable ("C") u otros formatos

  if (PREFIJOS_DUALES.some((p) => simbolo.startsWith(p))) return null
  if (simbolo.startsWith('S')) return null // LECAP: el sitio las toma solas de argentinadatos
  if (simbolo.startsWith('TM')) return { categoria: 'TAMAR', clave: simbolo }
  if (simbolo.startsWith('TZX') || simbolo.startsWith('TX')) return { categoria: 'BONCER', clave: simbolo }
  if (/^T\d{2}[A-Z]\d$/.test(simbolo)) return { categoria: 'BONCAP', clave: simbolo }
  return null
}

// ¿El sitio ya lo muestra (o ya se ocupa de él solo)?
export function yaEstaEnElSitio({ categoria, clave }, mapas) {
  if (categoria === 'GLOBALES' || categoria === 'BONARES') {
    const anio = clave.match(/^(?:GD|AL|AE)(\d{2})D$/)
    if (anio && mapas.MATURITY_BY_YEAR[Number(anio[1])]) return true // serie 2020: automática
    if (categoria === 'BONARES') return clave.slice(0, -1) in mapas.BONARES_NUEVOS_META
    return false
  }
  return clave in mapas[CATEGORIAS[categoria].mapa]
}

// simbolos: [{ symbol, c }] tal cual llegan de data912.
export function detectarNuevos(simbolos, mapas, ignorados) {
  const ignorar = new Set(ignorados.map((i) => i.ticker))
  const vistos = new Set()
  const nuevos = []
  for (const { symbol, c } of simbolos) {
    if (!c || vistos.has(symbol)) continue
    vistos.add(symbol)
    const clase = clasificar(symbol)
    if (!clase || ignorar.has(clase.clave) || yaEstaEnElSitio(clase, mapas)) continue
    nuevos.push({ ...clase, precio: c })
  }
  return nuevos.sort((a, b) => a.clave.localeCompare(b.clave))
}

// Marca que el detector deja en el cuerpo del aviso para que el que aplica la respuesta
// sepa de qué bono se trata sin depender del título.
export const marca = ({ clave, categoria, prueba }) =>
  `<!-- bono-nuevo ticker=${clave} categoria=${categoria} prueba=${prueba ? 1 : 0} -->`

export function leerMarca(texto) {
  const m = /<!-- bono-nuevo ticker=([A-Z0-9]{3,8}) categoria=([A-Z]+) prueba=([01]) -->/.exec(texto ?? '')
  if (!m || !CATEGORIAS[m[2]]) return null
  return { clave: m[1], categoria: m[2], prueba: m[3] === '1' }
}
