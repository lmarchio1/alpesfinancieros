// Tasa de la Reserva Federal desde la API oficial de la Fed de Nueva York (sin clave, y
// permite leerla desde el navegador). Cada día trae la tasa efectiva de fondos federales
// (EFFR, la tasa promedio a la que se prestaron los bancos de un día para otro) y el rango
// objetivo que fijó el FOMC para ese día.
//
// Lo usan el navegador (tarjeta de Tasas EEUU) y la tarea programada que guarda la
// historia (scripts/cachear-fed.mjs), así que no depende de nada del navegador.

const API = 'https://markets.newyorkfed.org/api/rates/unsecured/effr'

export const urlUltimaTasaFed = () => `${API}/last/1.json`
export const urlTasaFedEntre = (desde, hasta) => `${API}/search.json?startDate=${desde}&endDate=${hasta}`

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v)

// Días válidos, del más viejo al más nuevo: { fecha, efectiva, desde, hasta }.
export function parsearTasasFed(json) {
  const filas = Array.isArray(json?.refRates) ? json.refRates : []
  return filas
    .map((r) => ({
      fecha: String(r.effectiveDate ?? '').slice(0, 10),
      efectiva: Number(r.percentRate),
      desde: Number(r.targetRateFrom),
      hasta: Number(r.targetRateTo),
    }))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.fecha) && esNumero(d.efectiva) && esNumero(d.desde) && esNumero(d.hasta))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// Días en que entró en vigencia un rango nuevo (el primero de la serie también cuenta,
// como punto de partida). La Fed decide al cierre de la reunión y el rango rige desde el
// día hábil siguiente, que es la fecha que queda acá.
export function cambiosDeRango(dias) {
  const cambios = []
  for (const d of dias) {
    const ultimo = cambios.at(-1)
    if (!ultimo || ultimo.desde !== d.desde || ultimo.hasta !== d.hasta) {
      cambios.push({ fecha: d.fecha, desde: d.desde, hasta: d.hasta })
    }
  }
  return cambios
}

export function restarDiasFed(fechaIso, dias) {
  const d = new Date(`${fechaIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - dias)
  return d.toISOString().slice(0, 10)
}
