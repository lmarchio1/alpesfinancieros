import { useCallback, useEffect, useState } from 'react'
import { fetchConReintento } from '../utils/fetchRetry'

const PERSIST_PREFIX = 'alpes_cache_'

function leerCache(persistKey) {
  if (!persistKey || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(PERSIST_PREFIX + persistKey)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function guardarCache(persistKey, data, updatedAt) {
  if (!persistKey || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PERSIST_PREFIX + persistKey, JSON.stringify({ data, updatedAt: updatedAt.toISOString() }))
  } catch {
    // localStorage puede no estar disponible (modo privado, cuota llena).
  }
}

// Con persistKey, la última respuesta buena queda guardada en localStorage: al volver
// a abrir una pestaña que ya se había cargado antes (en esta misma sesión de
// navegador), se muestra ese dato al instante -sin skeleton- mientras se pide la
// versión fresca en segundo plano ("stale-while-revalidate"). Sin persistKey se
// comporta exactamente igual que antes.
export function usePolling(fetcher, { intervalMs = 60000, persistKey } = {}) {
  const [cacheInicial] = useState(() => leerCache(persistKey))

  const [data, setData] = useState(cacheInicial?.data ?? null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(!cacheInicial)
  const [updatedAt, setUpdatedAt] = useState(cacheInicial ? new Date(cacheInicial.updatedAt) : null)

  const load = useCallback(async () => {
    try {
      const result = await fetchConReintento(fetcher)
      const ahora = new Date()
      setData(result)
      setUpdatedAt(ahora)
      setError(null)
      guardarCache(persistKey, result, ahora)
    } catch (err) {
      setError(err.message || 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [fetcher, persistKey])

  useEffect(() => {
    load()
    const id = setInterval(load, intervalMs)
    return () => clearInterval(id)
  }, [load, intervalMs])

  return { data, error, loading, updatedAt, refresh: load }
}
