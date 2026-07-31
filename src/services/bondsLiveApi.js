import { fetchArgBonds } from './data912Api'
import { GLOBALES_META, BONARES_META, DUALES_META } from '../data/bondsReference'

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

// Globales/Bonares en dólar MEP (sufijo "D"): precio comparable, ~100 por
// cada 100 de valor nominal. Duales cotizan directo en pesos, sin sufijo.
export async function fetchUniversoBonos() {
  const bonds = await fetchArgBonds()
  const porSimbolo = new Map(bonds.map((b) => [b.symbol, b]))

  return {
    globales: mapearGrupo(GLOBALES_META, 'D', porSimbolo),
    bonares: mapearGrupo(BONARES_META, 'D', porSimbolo),
    duales: mapearGrupo(DUALES_META, '', porSimbolo),
  }
}
