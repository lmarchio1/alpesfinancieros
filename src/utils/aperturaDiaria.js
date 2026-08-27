function fechaArgentinaHoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

// Apertura del día (primer precio visto hoy en este navegador), para calcular la
// variación como "cuánto se movió desde que abrió el mercado hoy" en vez de confiar
// en el % que devuelve la fuente en vivo -que no tiene forma de saber que ya es un
// día nuevo, y sigue mostrando el cambio de la sesión anterior hasta que el mercado
// vuelve a operar-. Se guarda en localStorage por clave (ticker) y se reinicia solo
// al cambiar la fecha.
export function obtenerAperturaDiaria(storageKey, valoresActuales) {
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

  return cache.valores
}
