import { useCallback, useState } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { fetchOtrasMonedas } from '../../services/forexApi'
import Card from '../ui/Card'
import Badge from '../ui/Badge'

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
const formatUsd = (value, decimales = 2) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(value)

const MONEDAS_INFO = {
  EUR: { nombre: 'Euro', simbolo: '€', unidad: 1, decimalesUsd: 4, decimalesInverso: 4, border: 'border-indigo-500', iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
  GBP: { nombre: 'Libra esterlina', simbolo: '£', unidad: 1, decimalesUsd: 4, decimalesInverso: 4, border: 'border-rose-500', iconBg: 'bg-rose-50', iconText: 'text-rose-600' },
  BRL: { nombre: 'Real brasileño', simbolo: 'R$', unidad: 1, decimalesUsd: 4, decimalesInverso: 4, border: 'border-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  CLP: { nombre: 'Peso chileno', simbolo: 'CLP', unidad: 1000, decimalesUsd: 2, decimalesInverso: 0, border: 'border-sky-500', iconBg: 'bg-sky-50', iconText: 'text-sky-600' },
  COP: { nombre: 'Peso colombiano', simbolo: 'COP', unidad: 1000, decimalesUsd: 2, decimalesInverso: 0, border: 'border-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
}

const formatFecha = (fechaIso) =>
  new Date(`${fechaIso}T00:00:00Z`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })

export default function OtrasMonedasTab() {
  const fetcher = useCallback(() => fetchOtrasMonedas(), [])
  const { data, error, loading, refresh } = usePolling(fetcher, { intervalMs: 60 * 60 * 1000 })
  const [inverso, setInverso] = useState(false)

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => setInverso(false)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                !inverso ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Moneda → $
            </button>
            <button
              type="button"
              onClick={() => setInverso(true)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                inverso ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              US$ → Moneda
            </button>
          </div>
          <Badge variant="info">Actualización diaria</Badge>
        </div>
        <div className="flex items-center gap-3 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 shadow-sm backdrop-blur-sm">
          {data.fecha && <span>Cotización del {formatFecha(data.fecha)}</span>}
          <button type="button" onClick={refresh} className="font-semibold text-brand-300 hover:text-white hover:underline">
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.cotizaciones.map((m, i) => {
          const info = MONEDAS_INFO[m.codigo]
          const ars = m.ars * info.unidad
          const usd = m.usd * info.unidad
          const etiqueta = info.unidad === 1 ? '1 ' + m.codigo : `${info.unidad.toLocaleString('es-AR')} ${m.codigo}`
          return (
            <Card
              key={m.codigo}
              className={`group animate-fade-up border-t-4 p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none ${info.border}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${info.iconBg} ${info.iconText} text-sm font-bold`}>
                    {info.simbolo}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{info.nombre}</p>
                    <p className="text-xs text-slate-400">{inverso ? `US$ → ${m.codigo}` : `Cada ${etiqueta}`}</p>
                  </div>
                </div>
                {m.variacionPct !== null && (
                  <Badge variant={m.variacionPct >= 0 ? 'positive' : 'negative'}>
                    {m.variacionPct >= 0 ? '+' : ''}
                    {m.variacionPct.toFixed(2)}%
                  </Badge>
                )}
              </div>
              {inverso ? (
                <div className="mt-4">
                  <p className="text-xs text-slate-500">1 dólar estadounidense equivale a</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {m.porUsd.toFixed(info.decimalesInverso)} {info.simbolo}
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500">En pesos</p>
                    <p className="text-lg font-bold text-slate-900">{formatArs(ars)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">En dólares</p>
                    <p className="text-lg font-bold text-slate-900">{formatUsd(usd, info.decimalesUsd)}</p>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <p className="mt-5 text-xs text-slate-300">
        Valores de referencia contra el dólar estadounidense, actualizados una vez por día. Son a título
        informativo, no constituyen asesoramiento ni una recomendación de inversión, y pueden diferir del
        precio de mercado en tiempo real — no sustituyen la cotización de tu banco o broker al momento de
        operar.
      </p>
    </div>
  )
}
