// Espera a que el sitio publicado incluya un bono recién agregado, para confirmarle al
// usuario que ya está en línea (lo usa respuesta-bono-nuevo.yml después del deploy).
// Mira el sitio real, no el repo: baja el index, sigue los archivos JS que referencia y
// busca la entrada compilada del bono, que queda como TICKER:{vencimiento:"AAAA-MM-DD"}.
//
// Variables: TICKER, FECHA (AAAA-MM-DD). Sale con 0 cuando lo encuentra y con 1 si no
// aparece en 15 minutos (el deploy tarda ~1-6 min y el CDN de GitHub Pages cachea hasta 10).
const { TICKER, FECHA } = process.env
const SITIO = 'https://alpesestadosfinancieros.com.ar'
const LIMITE = Date.now() + Number(process.env.ESPERA_SEG ?? 15 * 60) * 1000

if (!/^[A-Z0-9]{3,8}$/.test(TICKER ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(FECHA ?? '')) {
  console.error('TICKER o FECHA inválidos')
  process.exit(1)
}
const buscado = `${TICKER}:{vencimiento:"${FECHA}"`

// El parámetro "v" evita que el CDN devuelva una copia vieja.
async function texto(ruta) {
  const res = await fetch(`${SITIO}${ruta}?v=${Date.now()}`)
  if (!res.ok) throw new Error(`${ruta}: ${res.status}`)
  return res.text()
}

async function estaPublicado() {
  const html = await texto('/')
  const principal = /src="(\/assets\/index-[^"]+\.js)"/.exec(html)?.[1]
  if (!principal) return false
  const js = await texto(principal)
  if (js.includes(buscado)) return true
  const chunks = new Set([...js.matchAll(/([A-Za-z0-9]+-[A-Za-z0-9_-]{8}\.js)/g)].map((m) => m[1]))
  for (const chunk of chunks) {
    if ((await texto(`/assets/${chunk}`)).includes(buscado)) return true
  }
  return false
}

while (Date.now() < LIMITE) {
  try {
    if (await estaPublicado()) {
      console.log(`${TICKER} ya está publicado en ${SITIO}`)
      process.exit(0)
    }
  } catch (err) {
    console.warn(`Reintento: ${err.message}`)
  }
  await new Promise((r) => setTimeout(r, 30_000))
}
console.error(`${TICKER} no apareció en el sitio publicado dentro del tiempo de espera`)
process.exit(1)
