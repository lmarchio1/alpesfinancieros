function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

// Apertura de mercado capturada una vez por día hábil por un GitHub Action (ver
// .github/workflows/apertura-mep-ccl.yml y scripts/capturar-apertura-mercado.mjs) y
// guardada como JSON estático: misma apertura para todos los visitantes del día, sin
// backend propio. Mismo patrón que apertura-mep-ccl.json.
async function fetchAperturaCentral() {
  try {
    const res = await fetch(`/apertura-mercado.json?_=${Date.now()}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.fecha === fechaArgentinaHoy() ? data.precios : null
  } catch {
    return null
  }
}

// Respaldo si el archivo central todavía no se actualizó hoy (temprano a la mañana
// antes de que corra el Action, un ticker nuevo que el Action no llegó a capturar, o
// si llegara a fallar): se usa como referencia el primer precio visto hoy en este
// navegador. Se guarda en localStorage y se reinicia solo al cambiar la fecha.
//
// En cualquier caso, esto reemplaza confiar en el "% de variación" que devuelve la
// fuente en vivo -que no tiene forma de saber que ya es un día nuevo, y sigue
// mostrando el cambio de la sesión anterior hasta que el mercado vuelve a operar-.
export async function obtenerAperturaDiaria(storageKey, valoresActuales) {
  const central = await fetchAperturaCentral()

  const hoy = fechaArgentinaHoy()
  let cache
  try {
    cache = JSON.parse(localStorage.getItem(storageKey) || '{}')
  } catch {
    cache = {}
  }
  if (cache.fecha !== hoy) cache = { fecha: hoy, valores: {} }

  let cambio = false
  for (const [clave, valor] of valoresActuales) {
    if (typeof central?.[clave] === 'number') continue // el central tiene prioridad
    if (typeof valor === 'number' && typeof cache.valores[clave] !== 'number') {
      cache.valores[clave] = valor
      cambio = true
    }
  }

  if (cambio) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cache))
    } catch {
      // localStorage puede no estar disponible (modo privado, cuota llena).
    }
  }

  return { ...cache.valores, ...central }
}
