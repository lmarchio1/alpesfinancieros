import { useCallback, useMemo, useState } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { fetchInflacionMensual } from '../../services/inflacionApi'
import { valorActualizado, factorAcumulado, inflacionInteranual } from '../../utils/inflacionMath'
import Card from '../ui/Card'
import Badge from '../ui/Badge'

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)

function mesActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function haceAnios(n) {
  const now = new Date()
  const y = now.getFullYear() - n
  return `${y}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function InflacionTab() {
  const fetcher = useCallback(() => fetchInflacionMensual(), [])
  const { data, error, loading, updatedAt, refresh } = usePolling(fetcher, { intervalMs: 30 * 60 * 1000 })

  const [monto, setMonto] = useState(100000)
  const [desde, setDesde] = useState(haceAnios(5))

  const minMes = data?.[0]?.fecha.slice(0, 7)
  const maxMes = mesActual()

  const resultado = useMemo(() => {
    if (!data || !desde) return null
    const factor = factorAcumulado(data, desde)
    return {
      valorHoy: valorActualizado(data, monto, desde),
      inflacionAcumuladaPct: (factor - 1) * 100,
    }
  }, [data, monto, desde])

  const interanual = useMemo(() => (data ? inflacionInteranual(data) : null), [data])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
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
        <Badge variant="positive">● En vivo · argentinadatos.com (INDEC)</Badge>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {updatedAt && <span>Actualizado {updatedAt.toLocaleTimeString('es-AR')}</span>}
          <button type="button" onClick={refresh} className="font-medium text-brand-600 hover:underline">
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {interanual !== null && (
          <Card className="p-6">
            <p className="text-sm text-slate-500">Inflación interanual</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{interanual.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-slate-400">Acumulado de los últimos 12 meses</p>
          </Card>
        )}

        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-900">¿Cuánto vale hoy tu plata?</h3>
          <p className="mt-1 text-sm text-slate-500">
            Ingresá un monto y desde cuándo lo tenías: te decimos qué valor tiene hoy ajustado por
            inflación.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-500">Monto</label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-slate-500">$</span>
                <input
                  type="number"
                  min="0"
                  value={monto}
                  onChange={(e) => setMonto(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Desde</label>
              <input
                type="month"
                min={minMes}
                max={maxMes}
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {resultado && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Equivalen hoy a</p>
                <p className="text-2xl font-bold text-brand-600">{formatArs(resultado.valorHoy)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Inflación acumulada en el período</p>
                <p className="text-2xl font-bold text-slate-900">
                  +{resultado.inflacionAcumuladaPct.toFixed(0)}%
                </p>
              </div>
            </div>
          )}

          <p className="mt-5 text-xs text-slate-400">
            Cálculo con el índice de inflación mensual oficial (INDEC). Sirve para dimensionar la
            pérdida de poder adquisitivo de la plata parada — no es una proyección a futuro.
          </p>
        </Card>
      </div>
    </div>
  )
}
