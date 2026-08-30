import { fetchArgBonds } from './data912Api'
import {
  MATURITY_BY_YEAR,
  BONARES_NUEVOS_META,
  BONCAP_META,
  TAMAR_META,
  BOPREAL_META,
  BONCER_META,
} from '../data/bondsReference'
import { fetchCierresDeAyer } from './supabaseClient'

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

    if (vistos.has(symbol)) continue
    vistos.add(symbol)

    const live = porSimbolo.get(symbol)
    if (!live || !live.c) continue

    resultado.push({
      ticker: symbol, // con la "D" (ej. "GD30D"): es la cotización en dólares que se muestra
      symbolLive: symbol, // símbolo real en data912 (con sufijo), para la apertura diaria
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
      const symbol = `${ticker}${sufijo}`
      const live = porSimbolo.get(symbol)
      if (!live || !live.c) return null
      return {
        ticker: symbol, // con el sufijo si lo tiene (ej. "AO27D"): es la cotización real que se muestra
        symbolLive: symbol,
        ...info,
        precio: live.c,
        variacionPorcentaje: live.pct_change,
      }
    })
    .filter(Boolean)
}

export async function fetchUniversoBonos(forzar = false) {
  const bonds = await fetchArgBonds(forzar)
  const porSimbolo = new Map(bonds.map((b) => [b.symbol, b]))

  const bonaresNuevos = mapearGrupo(BONARES_NUEVOS_META, 'D', porSimbolo)
  const bonares = [...mapearFamiliaPorAnio(['AL', 'AE'], 'ARG', porSimbolo), ...bonaresNuevos].sort(
    (a, b) => new Date(a.vencimiento) - new Date(b.vencimiento)
  )
  const globales = mapearFamiliaPorAnio(['GD'], 'NY', porSimbolo)
  const boncap = mapearGrupo(BONCAP_META, '', porSimbolo)
  const tamar = mapearGrupo(TAMAR_META, '', porSimbolo).sort(
    (a, b) => new Date(a.vencimiento) - new Date(b.vencimiento)
  )
  const bopreal = mapearGrupo(BOPREAL_META, '', porSimbolo)
  const boncer = mapearGrupo(BONCER_META, '', porSimbolo)

  // data912 no da timestamp por especie y sigue devolviendo el % de la rueda anterior
  // toda la madrugada, hasta que el mercado vuelve a operar -confirmado en vivo: a las
  // 00:14 mostraba +0.40% para GD30D con el precio sin cambios desde el cierre de
  // ayer-. El cierre de ayer (capturado a las 00hs, ver cierre-diario.yml) se usa solo
  // como testigo: mientras el precio en vivo sea igual a ese cierre, no hubo
  // movimiento real todavía y se muestra 0%. En cuanto el precio se mueva, se confía
  // en el pct_change que da data912 tal cual -una vez que el mercado opera, ese campo
  // sí refleja el cambio real, no hace falta recalcularlo-.
  // Se usa symbolLive (igual a "ticker" acá, ya que ambos incluyen el sufijo) como
  // clave para el cierre de ayer.
  const todos = [...globales, ...bonares, ...boncap, ...tamar, ...bopreal, ...boncer]
  const cierres = await fetchCierresDeAyer(todos.map((b) => b.symbolLive))
  const conVariacionDeHoy = ({ symbolLive, ...b }) => {
    const cierre = cierres[symbolLive]
    const sinMovimiento = typeof cierre === 'number' && Math.abs(b.precio - cierre) < 0.005
    return {
      ...b,
      variacionPorcentaje: sinMovimiento ? 0 : b.variacionPorcentaje,
    }
  }

  return {
    globales: globales.map(conVariacionDeHoy),
    bonares: bonares.map(conVariacionDeHoy),
    boncap: boncap.map(conVariacionDeHoy),
    tamar: tamar.map(conVariacionDeHoy),
    bopreal: bopreal.map(conVariacionDeHoy),
    boncer: boncer.map(conVariacionDeHoy),
  }
}
