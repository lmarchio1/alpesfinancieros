const URL = 'https://api.argentinadatos.com/v1/finanzas/rem/ultimo'

// Relevamiento de Expectativas de Mercado (BCRA): mediana de pronósticos de IPC
// nivel general, panel completo de participantes ("todos"), última encuesta publicada.
export async function fetchExpectativaInflacionREM() {
  const res = await fetch(URL)
  if (!res.ok) throw new Error('No se pudo obtener el REM del BCRA')
  const registros = await res.json()

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
  const res = await fetch(URL)
  if (!res.ok) throw new Error('No se pudo obtener el REM del BCRA')
  const registros = await res.json()

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
