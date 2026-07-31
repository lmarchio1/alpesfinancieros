const BASE_URL = 'https://data912.com/live'

async function getJson(path) {
  const res = await fetch(`${BASE_URL}/${path}`)
  if (!res.ok) throw new Error('No se pudo obtener precios de mercado')
  return res.json()
}

// Letras y notas del Tesoro (LECAPs, BONCAPs): precio actual por 100 nominal.
export async function fetchArgNotes() {
  return getJson('arg_notes')
}

// Globales, Bonares, Boncer y duales: precio actual por especie.
export async function fetchArgBonds() {
  return getJson('arg_bonds')
}
