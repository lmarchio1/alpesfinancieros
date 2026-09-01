import { fetchPreciosCache } from './supabaseClient'

const BASE_URL = 'https://data912.com/live'

async function getJson(path) {
  const res = await fetch(`${BASE_URL}/${path}`)
  if (!res.ok) throw new Error('No se pudo obtener precios de mercado')
  return res.json()
}

// El Action que llena esta cache está programado cada 5 min, pero en la práctica
// GitHub lo viene corriendo cada 2-8hs (no garantiza el horario de un cron, se
// verificó en vivo) -mientras no se resuelva eso con un disparador externo, el techo
// de frescura por default de fetchPreciosCache (30 min) casi nunca se cumple y la
// cache queda inactiva casi siempre-. Se sube acá a 3hs como paliativo temporal:
// mejor aprovechar un dato de bonos/CCL de hasta 3hs (siguen siendo el mismo
// universo, no cambia la lista de instrumentos) que pegarle directo a data912.com en
// cada apertura de pestaña sin ninguna protección si data912 tiene un problema.
const DATA912_CACHE_MAX_ANTIGUEDAD_MS = 3 * 60 * 60 * 1000 // 3 horas

// Intenta primero la cache de Supabase (ver scripts/cachear-precios.mjs) para no
// depender de data912.com en cada apertura de pestaña. Si no hay fila, está vieja, o
// Supabase no responde, cae al fetch directo de siempre -mismo comportamiento que
// antes de agregar la cache-. Con forzar=true se salta la cache a propósito (botón
// "Actualizar ahora").
async function getConCache(fuente, path, forzar) {
  if (!forzar) {
    const cacheado = await fetchPreciosCache(fuente, DATA912_CACHE_MAX_ANTIGUEDAD_MS)
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
