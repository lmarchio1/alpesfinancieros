import { useCallback, useEffect, useState } from 'react'

export function usePolling(fetcher, { intervalMs = 60000 } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const result = await fetcher()
      setData(result)
      setUpdatedAt(new Date())
    } catch (err) {
      setError(err.message || 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    load()
    const id = setInterval(load, intervalMs)
    return () => clearInterval(id)
  }, [load, intervalMs])

  return { data, error, loading, updatedAt, refresh: load }
}
