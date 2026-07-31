const BASE_URL = 'https://dolarapi.com/v1'

export async function fetchDolares() {
  const res = await fetch(`${BASE_URL}/dolares`)
  if (!res.ok) throw new Error('No se pudo obtener la cotización del dólar')
  return res.json()
}
