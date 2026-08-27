import { fetchArgBonds } from './data912Api'
import { DUALES_META, MATURITY_BY_YEAR, BONARES_NUEVOS_META } from '../data/bondsReference'
import { obtenerAperturaDiaria } from '../utils/aperturaDiaria'

const APERTURA_KEY = 'alpes_apertura_mercado'

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

  const bonaresNuevos = mapearGrupo(BONARES_NUEVOS_META, 'D', porSimbolo)
  const bonares = [...mapearFamiliaPorAnio(['AL', 'AE'], 'ARG', porSimbolo), ...bonaresNuevos].sort(
    (a, b) => new Date(a.vencimiento) - new Date(b.vencimiento)
  )
  const globales = mapearFamiliaPorAnio(['GD'], 'NY', porSimbolo)
  const duales = mapearGrupo(DUALES_META, '', porSimbolo)

  // data912 no da timestamp por especie y sigue devolviendo el % de la rueda anterior
  // toda la madrugada, hasta que el mercado vuelve a operar. Se recalcula la variación
  // contra el primer precio visto hoy en este navegador (ver obtenerAperturaDiaria) en
  // vez de confiar en ese %: pasada la medianoche da 0% y solo vuelve a moverse cuando
  // el precio efectivamente cambia.
  const todos = [...globales, ...bonares, ...duales]
  const aperturas = obtenerAperturaDiaria(APERTURA_KEY, new Map(todos.map((b) => [b.ticker, b.precio])))
  const conVariacionDeHoy = (b) => {
    const apertura = aperturas[b.ticker]
    return {
      ...b,
      variacionPorcentaje: apertura > 0 ? ((b.precio - apertura) / apertura) * 100 : b.variacionPorcentaje,
    }
  }

  return {
    globales: globales.map(conVariacionDeHoy),
    bonares: bonares.map(conVariacionDeHoy),
    duales: duales.map(conVariacionDeHoy),
  }
}
