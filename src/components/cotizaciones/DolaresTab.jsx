import { useCallback } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { fetchDolares } from '../../services/dolaresApi'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import FlashPrice from '../ui/FlashPrice'

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)

export default function DolaresTab() {
  const fetcher = useCallback(() => fetchDolares(), [])
  const { data, error, loading, updatedAt, refresh } = usePolling(fetcher, { intervalMs: 60000 })

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-rose-600">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Reintentar
        </button>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Badge variant="positive">● En vivo · dolarapi.com</Badge>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {updatedAt && <span>Actualizado {updatedAt.toLocaleTimeString('es-AR')}</span>}
          <button type="button" onClick={refresh} className="font-medium text-brand-600 hover:underline">
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((d, i) => (
          <Card
            key={d.casa}
            className="animate-fade-up p-5 motion-reduce:animate-none"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{d.nombre}</h3>
              <Badge variant="neutral">{d.casa}</Badge>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-500">Compra</p>
                <FlashPrice value={d.compra} formatted={formatArs(d.compra)} className="text-lg font-bold" />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Venta</p>
                <FlashPrice value={d.venta} formatted={formatArs(d.venta)} className="text-lg font-bold" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
