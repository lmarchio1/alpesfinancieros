// Lectura de las tablas públicas de Supabase.
//
// Se hace con fetch a secas contra la API REST, sin el SDK @supabase/supabase-js: el
// SDK pesaba 59 KB comprimidos (220 KB sin comprimir) en el bundle para hacer dos
// SELECT sin autenticación ni tiempo real, y cualquiera que abriera una pestaña que
// dependa de Supabase tenía que bajarlos. La API REST es HTTP común: la misma consulta
// sale en una línea de URL. El SDK se sigue usando del lado del servidor, en los
// scripts de GitHub Actions que ESCRIBEN estas tablas, donde el peso no importa.
//
// Las dos tablas son de solo lectura pública (RLS sin política de escritura), así que
// la clave publicable que viaja al navegador no permite modificar nada.
const URL_BASE = import.meta.env.VITE_SUPABASE_URL
const CLAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Un build sin estas variables ya tumbó la página entera una vez (el SDK tiraba una
// excepción sincrónica al inicializarse). Ahora, sin credenciales, simplemente no se
// consulta: se pierden las comparaciones que dependen de Supabase y el resto sigue.
const configurado = Boolean(URL_BASE && CLAVE)
if (!configurado) console.error('Faltan las variables de entorno de Supabase: no se leerán los cierres ni la cache.')

// Si Supabase no contesta, el que llama tiene que poder caer a su alternativa rápido,
// en vez de dejar la pestaña colgada esperando.
const ESPERA_MAXIMA_MS = 8000

function limite() {
  try {
    return AbortSignal.timeout(ESPERA_MAXIMA_MS)
  } catch {
    return undefined // Navegador viejo: sin corte por tiempo, igual que antes.
  }
}

async function consultar(tabla, parametros) {
  if (!configurado) return null
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/${tabla}?${parametros}`, {
      headers: { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` },
      signal: limite(),
    })
    if (!res.ok) return null
    const filas = await res.json()
    return Array.isArray(filas) ? filas : null
  } catch {
    return null
  }
}

function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

function fechaArgentinaAyer() {
  const hoy = fechaArgentinaHoy()
  const d = new Date(`${hoy}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Cierre de cada instrumento capturado a las 00hs ART por un GitHub Action (ver
// .github/workflows/cierre-diario.yml y scripts/capturar-cierre-diario.mjs) y guardado
// en Supabase: un único valor, igual para todos los visitantes sin importar cuándo
// entren -a diferencia del respaldo por localStorage que se usaba antes, que podía
// quedar distinto entre navegadores según el momento en que cada uno cargó la página-.
export async function fetchCierresDeAyer(instrumentos) {
  // Cada nombre va entre comillas: así un valor con coma o paréntesis no puede alterar
  // la lista que se manda (la API separa los elementos por coma).
  const lista = instrumentos.map((i) => `"${String(i).replaceAll('"', '')}"`).join(',')
  const filas = await consultar(
    'cierres_diarios',
    `select=instrumento,valor&fecha=eq.${fechaArgentinaAyer()}&instrumento=in.(${encodeURIComponent(lista)})`,
  )
  if (!filas) return {}
  return Object.fromEntries(filas.map((r) => [r.instrumento, r.valor]))
}

const CACHE_MAX_ANTIGUEDAD_MS = 30 * 60 * 1000 // 30 minutos: bonos/CCL, se mueven en horario de rueda

// Respuesta cruda de una fuente externa (data912, BCRA, etc.), cacheada periódicamente
// por un GitHub Action (ver scripts/cachear-precios.mjs) para no depender de esa fuente
// en cada apertura de pestaña. Si no hay fila, o está más vieja que el techo de frescura
// (el Action tardó en correr -GitHub no garantiza el horario exacto de un cron, se vio
// en vivo corriendo cada 2-8hs en vez de cada 5 min-, o Supabase no responde), devuelve
// null: el que llama cae al fetch directo de siempre. maxAntiguedadMs es configurable
// por fuente: 30 min por default sirve para datos que se mueven en el día (bonos/CCL),
// pero para algo que el BCRA solo publica una vez por día no tiene sentido ese límite
// tan corto -se pasa una ventana más larga para esos casos, ver bcraApi.js-.
export async function fetchPreciosCache(fuente, maxAntiguedadMs = CACHE_MAX_ANTIGUEDAD_MS) {
  const filas = await consultar(
    'precios_cache',
    `select=datos,actualizado_en&fuente=eq.${encodeURIComponent(fuente)}&limit=1`,
  )
  const fila = filas?.[0]
  if (!fila) return null

  const antiguedad = Date.now() - new Date(fila.actualizado_en).getTime()
  if (!Number.isFinite(antiguedad) || antiguedad > maxAntiguedadMs) return null

  return fila.datos
}
