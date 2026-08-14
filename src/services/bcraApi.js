const BASE_URL = 'https://api.bcra.gob.ar/estadisticas/v4.0/monetarias'

// Régimen de bandas cambiarias del BCRA: Límite inferior (1187) y superior (1188),
// ajustan a diario según la inflación (T-2). Serie oficial, con proyección a futuro
// ya publicada, por eso pedimos el valor exacto de "hoy" en vez del primer registro.
const ID_PISO = 1187
const ID_TECHO = 1188

async function fetchValorDelDia(idVariable, fecha) {
  const res = await fetch(`${BASE_URL}/${idVariable}?desde=${fecha}&hasta=${fecha}`)
  if (!res.ok) throw new Error('No se pudo obtener la banda cambiaria')
  const json = await res.json()
  return json.results?.[0]?.detalle?.[0]?.valor ?? null
}

export async function fetchBandaCambiaria() {
  const fecha = new Date().toISOString().slice(0, 10)
  const [piso, techo] = await Promise.all([
    fetchValorDelDia(ID_PISO, fecha),
    fetchValorDelDia(ID_TECHO, fecha),
  ])
  if (piso == null || techo == null) return null
  return { piso, techo, fecha }
}
