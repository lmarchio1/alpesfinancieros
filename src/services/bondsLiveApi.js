import { fetchArgBonds } from './data912Api'
import { DUALES_META, MATURITY_BY_YEAR } from '../data/bondsReference'

// Globales y Bonares en dólar MEP (sufijo "D"): detecta automáticamente cualquier
// ticker que matchee el prefijo de la familia y cuyo año de vencimiento esté en
// MATURITY_BY_YEAR, en vez de depender de una lista fija de tickers a mano.
function mapearFamiliaPorAnio(prefijos, ley, porSimbolo) {
  const vistos = new Set()
  const resultado = []

  for (const symbol of porSimbolo.keys()) {
    const prefijo = prefijos.find((p) => symbol.startsWith(p))
    if (!prefijo) continue

    const match = symbol.match(new RegExp(`^${prefijo}(\\d{2})D$`))
    if (!match) continue

    const anio = Number(match[1])
    const meta = MATURITY_BY_YEAR[anio]
    if (!meta) continue // año no reconocido todavía: ver comentario en bondsReference.js

    const ticker = symbol.slice(0, -1) // sin la "D" final
    if (vistos.has(ticker)) continue
    vistos.add(ticker)

    const live = porSimbolo.get(symbol)
    if (!live || !live.c) continue

    resultado.push({
      ticker,
      ley,
      vencimiento: meta.vencimiento,
      duracionAnios: meta.duracionAnios,
      precio: live.c,
      variacionPorcentaje: live.pct_change,
    })
  }

  return resultado.sort((a, b) => new Date(a.vencimiento) - new Date(b.vencimiento))
}

function mapearGrupo(meta, sufijo, porSimbolo) {
  return Object.entries(meta)
    .map(([ticker, info]) => {
      const live = porSimbolo.get(`${ticker}${sufijo}`)
      if (!live || !live.c) return null
      return {
        ticker,
        ...info,
        precio: live.c,
        variacionPorcentaje: live.pct_change,
      }
    })
    .filter(Boolean)
}

// Duales cotizan directo en pesos, sin sufijo.
export async function fetchUniversoBonos() {
  const bonds = await fetchArgBonds()
  const porSimbolo = new Map(bonds.map((b) => [b.symbol, b]))

  return {
    globales: mapearFamiliaPorAnio(['GD'], 'NY', porSimbolo),
    bonares: mapearFamiliaPorAnio(['AL', 'AE'], 'ARG', porSimbolo),
    duales: mapearGrupo(DUALES_META, '', porSimbolo),
  }
}
