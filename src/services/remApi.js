const URL = 'https://api.argentinadatos.com/v1/finanzas/rem/ultimo'
const REM_CACHE_KEY = 'alpes_rem_ultimo'

function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

// El "último informe" del REM (~110KB) lo piden por separado la tarjeta de Dólar
// Esperado (Tipos de Cambio) y la de Inflación Esperada (Inflación): sin esto, un
// visitante que abre las dos pestañas descarga el mismo informe dos veces. El REM
// se publica una vez al mes, así que alcanza con guardarlo en localStorage por día
// y reusarlo entre ambas tarjetas -y entre recargas de página del mismo día-.
let registrosEnMemoria = null

async function fetchRemUltimo() {
  if (registrosEnMemoria) return registrosEnMemoria

  const hoy = fechaArgentinaHoy()
  try {
    const cache = JSON.parse(localStorage.getItem(REM_CACHE_KEY) || '{}')
    if (cache.fecha === hoy && Array.isArray(cache.registros)) {
      registrosEnMemoria = cache.registros
      return registrosEnMemoria
    }
  } catch {
    // localStorage puede no estar disponible, o el valor guardado puede ser inválido.
  }

  const res = await fetch(URL)
  if (!res.ok) throw new Error('No se pudo obtener el REM del BCRA')
  const registros = await res.json()
  registrosEnMemoria = registros

  try {
    localStorage.setItem(REM_CACHE_KEY, JSON.stringify({ fecha: hoy, registros }))
  } catch {
    // localStorage puede no estar disponible (modo privado, cuota llena).
  }

  return registros
}

// Relevamiento de Expectativas de Mercado (BCRA): mediana de pronósticos de IPC
// nivel general, panel completo de participantes ("todos"), última encuesta publicada.
export async function fetchExpectativaInflacionREM() {
  const registros = await fetchRemUltimo()

  const ipc = registros.filter(
    (r) => r.muestra === 'todos' && r.indicador.startsWith('Precios minoristas (IPC nivel general')
  )

  const proximos12Meses = ipc.find((r) => r.periodoTipo === 'proximos_12_meses')
  const anioActual = ipc.find((r) => r.periodoTipo === 'anual' && r.periodo === new Date().getFullYear().toString())

  if (!proximos12Meses) return null

  return {
    informe: proximos12Meses.informe,
    proximos12MesesPct: proximos12Meses.mediana,
    anioActual: anioActual ? { anio: anioActual.periodo, pct: anioActual.mediana } : null,
    publicacionUrl: proximos12Meses.publicacionUrl,
  }
}

// Mediana de pronósticos de tipo de cambio nominal ($/USD) del REM, mes a mes,
// panel completo de participantes ("todos"), última encuesta publicada.
export async function fetchDolarEsperadoREM() {
  const registros = await fetchRemUltimo()

  const mensual = registros
    .filter((r) => r.muestra === 'todos' && r.indicador === 'Tipo de cambio nominal' && r.periodoTipo === 'mensual')
    .sort((a, b) => new Date(a.periodoDesde) - new Date(b.periodoDesde))

  if (mensual.length === 0) return null

  return {
    informe: mensual[0].informe,
    meses: mensual.map((r) => ({ periodoDesde: r.periodoDesde, mediana: r.mediana })),
    publicacionUrl: mensual[0].publicacionUrl,
  }
}
