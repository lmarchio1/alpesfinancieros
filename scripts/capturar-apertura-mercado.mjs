// Corre vía GitHub Actions (ver .github/workflows/apertura-mep-ccl.yml) cerca de la
// apertura del mercado para guardar una apertura de bonos/letras única, compartida por
// todos los visitantes del día -mismo motivo que apertura-mep-ccl.json: el sitio no
// tiene backend propio, así que un archivo estático que se regenera cada día hábil
// reemplaza a un valor "de base de datos".
//
// Se guarda el precio de TODOS los tickers que devuelve data912 (no solo los que hoy
// se muestran en el sitio) para no tener que mantener sincronizada acá la lista de
// series vigentes -eso ya lo filtra el propio front (bondsReference.js y el listado
// de letras de argentinadatos)-.

import { writeFile } from 'node:fs/promises'

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo obtener ${url}: ${res.status}`)
  return res.json()
}

const [bonds, notas] = await Promise.all([
  getJson('https://data912.com/live/arg_bonds'),
  getJson('https://data912.com/live/arg_notes'),
])

const precios = {}
for (const item of [...bonds, ...notas]) {
  if (typeof item.c === 'number' && item.c > 0) precios[item.symbol] = item.c
}

if (Object.keys(precios).length === 0) {
  console.error('No se pudo capturar ningún precio de arg_bonds/arg_notes.')
  process.exit(1)
}

const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
const salida = { fecha, precios }

await writeFile('public/apertura-mercado.json', JSON.stringify(salida, null, 2) + '\n')
console.log(`Apertura de mercado guardada: ${Object.keys(precios).length} tickers`)
