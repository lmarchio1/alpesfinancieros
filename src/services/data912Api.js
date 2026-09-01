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
//
// A diferencia del BCRA (bcraApi.js, 12hs de tolerancia porque publica una vez por
// día), bonos y CCL se mueven en horario de rueda: se probó subir esto a 3hs mientras
// el Action corre irregular, pero significaba repetir el mismo precio guardado hasta
// 3hs seguidas -aunque la pestaña siga preguntando cada 60s, le sigue preguntando a
// la misma fila vieja de Supabase-, o sea que la actualización en vivo dejaba de
// sentirse en vivo. Se vuelve al default (30 min) para no perder eso; con el Action
// corriendo irregular, esto simplemente hace que la mayoría de los pedidos caigan al
// fetch directo de siempre, como ya venía pasando antes de armar la cache.
// fetchArgBonds() se llama por separado desde dolaresApi.js (para el MEP) y desde
// bondsLiveApi.js (para todo el universo de bonos) -en Renta Fija, las dos disparan
// casi al mismo tiempo, duplicando el pedido de los ~191 bonos-. Este mapa evita ese
// duplicado: si ya hay un pedido en vuelo para la misma fuente, el segundo llamado
// reusa esa misma promesa en vez de disparar un fetch nuevo.
const enVuelo = new Map()

async function getConCache(fuente, path, forzar) {
  if (!forzar && enVuelo.has(fuente)) return enVuelo.get(fuente)

  const promesa = (async () => {
    if (!forzar) {
      const cacheado = await fetchPreciosCache(fuente)
      if (cacheado) return cacheado
    }
    return getJson(path)
  })()

  if (!forzar) {
    enVuelo.set(fuente, promesa)
    promesa.finally(() => enVuelo.delete(fuente))
  }
  return promesa
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
