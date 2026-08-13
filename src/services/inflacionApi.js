const URL = 'https://api.argentinadatos.com/v1/finanzas/indices/inflacion'

// Serie mensual de inflación (INDEC), [{ fecha: 'YYYY-MM-DD', valor: %mensual }],
// ordenada ascendente por fecha. Se actualiza una vez por mes cuando sale el dato oficial.
export async function fetchInflacionMensual() {
  const res = await fetch(URL)
  if (!res.ok) throw new Error('No se pudo obtener el índice de inflación')
  return res.json()
}
