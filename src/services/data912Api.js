import { fetchPreciosCache } from './supabaseClient'

const BASE_URL = 'https://data912.com/live'

async function getJson(path) {
  const res = await fetch(`${BASE_URL}/${path}`)
  if (!res.ok) throw new Error('No se pudo obtener precios de mercado')
  return res.json()
}

// Intenta primero la cache de Supabase (actualizada cada 5 min por un GitHub Action,
// ver scripts/cachear-precios.mjs) para no depender de data912.com en cada apertura de
// pestaña. Si no hay fila, está vieja, o Supabase no responde, cae al fetch directo de
// siempre -mismo comportamiento que antes de agregar la cache-. Con forzar=true se
// salta la cache a propósito (botón "Actualizar ahora").
async function getConCache(fuente, path, forzar) {
  if (!forzar) {
    const cacheado = await fetchPreciosCache(fuente)
    if (cacheado) return cacheado
  }
  return getJson(path)
}

// Letras y notas del Tesoro (LECAPs, BONCAPs): precio actual por 100 nominal.
export async function fetchArgNotes(forzar = false) {
  return getConCache('data912_arg_notes', 'arg_notes', forzar)
}

// Globales, Bonares, Boncer y duales: precio actual por especie.
export async function fetchArgBonds(forzar = false) {
  return getConCache('data912_arg_bonds', 'arg_bonds', forzar)
}

// CCL implícito por CEDEAR/ADR (ver dolaresApi.js: se usa una canasta de los
// más líquidos, no un ticker fijo).
export async function fetchArgCcl(forzar = false) {
  return getConCache('data912_ccl', 'ccl', forzar)
}
