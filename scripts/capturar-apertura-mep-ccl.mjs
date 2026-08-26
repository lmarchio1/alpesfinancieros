// Corre vía GitHub Actions (ver .github/workflows/apertura-mep-ccl.yml) cerca
// de la apertura del mercado para guardar una apertura de MEP/CCL única,
// compartida por todos los visitantes del día -el sitio no tiene backend
// propio, así que esto reemplaza a un valor "de base de datos" con un
// archivo estático que se regenera todos los días hábiles.
//
// Misma metodología AL30 que src/services/dolaresApi.js (fetchDolaresImplicitos):
// compra = vender el bono en pesos y comprarlo en dólares (AL30 bid / variante ask),
// venta = al revés (AL30 ask / variante bid).

import { writeFile } from 'node:fs/promises'

const res = await fetch('https://data912.com/live/arg_bonds')
if (!res.ok) {
  console.error('No se pudo obtener data912.com/live/arg_bonds:', res.status)
  process.exit(1)
}

const bonds = await res.json()
const porSimbolo = new Map(bonds.map((b) => [b.symbol, b]))
const al30 = porSimbolo.get('AL30')
const al30d = porSimbolo.get('AL30D')
const al30c = porSimbolo.get('AL30C')

function implicito(variante) {
  if (!al30?.px_bid || !al30?.px_ask || !variante?.px_bid || !variante?.px_ask) return null
  return {
    compra: al30.px_bid / variante.px_ask,
    venta: al30.px_ask / variante.px_bid,
  }
}

const mep = implicito(al30d)
const ccl = implicito(al30c)

if (!mep || !ccl) {
  console.error('No se pudo calcular MEP/CCL (faltan precios de AL30/AL30D/AL30C).')
  process.exit(1)
}

const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
const salida = { fecha, mep, ccl }

await writeFile('public/apertura-mep-ccl.json', JSON.stringify(salida, null, 2) + '\n')
console.log('Apertura guardada:', salida)
