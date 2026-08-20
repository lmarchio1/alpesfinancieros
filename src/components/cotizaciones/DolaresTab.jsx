import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { fetchDolares, fetchDolaresAyer } from '../../services/dolaresApi'
import { fetchBandaCambiaria } from '../../services/bcraApi'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import FlashPrice from '../ui/FlashPrice'
import DayChangeBadge from '../ui/DayChangeBadge'

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
const formatArsEntero = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)

const CASA_ICON = {
  oficial: {
    color: 'bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white',
    path: 'M3 21h18M4 10h16M4 10l8-6 8 6M6 10v9M10 10v9M14 10v9M18 10v9',
  },
  blue: {
    color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    path: 'M3 6h18v12H3zM7 6v12M17 6v12M12 9a3 3 0 100 6 3 3 0 000-6z',
  },
  bolsa: {
    color: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
    path: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  },
  contadoconliqui: {
    color: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white',
    path: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.2 2.4 3.5 5.5 3.5 9s-1.3 6.6-3.5 9c-2.2-2.4-3.5-5.5-3.5-9s1.3-6.6 3.5-9z',
  },
  mayorista: {
    color: 'bg-slate-100 text-slate-600 group-hover:bg-slate-600 group-hover:text-white',
    path: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10',
  },
  cripto: {
    color: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white',
    path: 'M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2zM9.5 10h5M12 8v8',
  },
  tarjeta: {
    color: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
    path: 'M3 6h18v12H3zM3 10h18M7 15h4',
  },
}

const NOMBRE_OVERRIDE = {
  contadoconliqui: 'CCL',
}

export default function DolaresTab() {
  const fetcher = useCallback(() => fetchDolares(), [])
  const { data, error, loading, updatedAt, refresh } = usePolling(fetcher, { intervalMs: 60000 })

  const [ayer, setAyer] = useState(null)
  useEffect(() => {
    fetchDolaresAyer()
      .then(setAyer)
      .catch(() => setAyer(null))
  }, [])

  const [banda, setBanda] = useState(null)
  useEffect(() => {
    fetchBandaCambiaria()
      .then(setBanda)
      .catch(() => setBanda(null))
  }, [])

  const mayorista = useMemo(() => data?.find((d) => d.casa === 'mayorista'), [data])

  const bandaPct = useMemo(() => {
    if (!banda || !mayorista) return null
    const raw = ((mayorista.venta - banda.piso) / (banda.techo - banda.piso)) * 100
    return Math.min(96, Math.max(4, raw))
  }, [banda, mayorista])

  const faltaParaTecho = useMemo(() => {
    if (!banda || !mayorista) return null
    return ((banda.techo - mayorista.venta) / mayorista.venta) * 100
  }, [banda, mayorista])

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
        <div className="flex items-center gap-3 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 shadow-sm backdrop-blur-sm">
          {updatedAt && <span>Actualizado {updatedAt.toLocaleTimeString('es-AR')}</span>}
          <button type="button" onClick={refresh} className="font-semibold text-brand-300 hover:text-white hover:underline">
            Actualizar
          </button>
        </div>
      </div>

      {banda && (
        <Card className="group mb-4 overflow-hidden !border-white/10 !bg-[#0F2942] p-5 !shadow-[0_10px_25px_-5px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 transition-transform duration-300 ease-out group-hover:scale-110">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M4 10v11M20 10v11M2 10l10-6 10 6M8 10v11M16 10v11" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-white">Banda Cambiaria / Zona de No Intervención (BCRA)</p>
              <p className="text-xs text-slate-300">Esquema de flotación administrada con ajuste diario por inflación (IPC).</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 items-end gap-4 sm:grid-cols-[auto_1fr_auto]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Piso</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-400">{formatArsEntero(banda.piso)}</p>
            </div>

            <div className="order-3 col-span-2 pt-3 sm:order-none sm:col-span-1 sm:px-5 sm:pt-6">
              <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-emerald-400 via-slate-300 to-rose-400 shadow-inner ring-1 ring-white/10">
                {bandaPct !== null && (
                  <div
                    className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={{ left: `${bandaPct}%` }}
                  >
                    <span className="mb-1.5 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-900 shadow-sm">
                      Mayorista {formatArsEntero(mayorista.venta)}
                      {faltaParaTecho !== null && (
                        <span className="ml-1 font-normal text-slate-500">
                          · falta {faltaParaTecho.toFixed(1)}% para el techo
                        </span>
                      )}
                    </span>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0F2942] bg-white shadow" />
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-400">Techo</p>
              <p className="mt-0.5 text-xl font-bold text-red-400">{formatArsEntero(banda.techo)}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((d, i) => {
          const ayerVenta = ayer?.[d.casa]?.venta
          const trend = typeof ayerVenta === 'number' ? Math.sign(d.venta - ayerVenta) : 0
          const trendBorder =
            trend > 0 ? 'border-t-emerald-500' : trend < 0 ? 'border-t-rose-500' : 'border-t-slate-200'

          const brecha =
            mayorista && d.casa !== 'mayorista' ? ((d.venta - mayorista.venta) / mayorista.venta) * 100 : null

          return (
            <Card
              key={d.casa}
              className={`group animate-fade-up border-t-4 p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:bg-gradient-to-br hover:from-white hover:to-brand-50/60 hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none ${trendBorder}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {CASA_ICON[d.casa] && (
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ease-out group-hover:scale-110 ${CASA_ICON[d.casa].color}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d={CASA_ICON[d.casa].path} />
                      </svg>
                    </div>
                  )}
                  <h3 className="font-semibold text-slate-900">{NOMBRE_OVERRIDE[d.casa] ?? d.nombre}</h3>
                </div>
                {brecha !== null ? (
                  <span className="whitespace-nowrap rounded-full border border-[#CBD5E1] bg-[#F1F5F9] px-2.5 py-0.5 text-xs font-medium text-slate-700 shadow-[0_4px_12px_rgba(15,23,42,0.05)]">
                    Brecha {brecha >= 0 ? '+' : ''}
                    {brecha.toFixed(1)}%
                  </span>
                ) : (
                  <Badge variant="neutral">Referencia</Badge>
                )}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-500">Compra</p>
                  <FlashPrice value={d.compra} formatted={formatArs(d.compra)} className="text-lg font-bold" />
                  <DayChangeBadge current={d.compra} previous={ayer?.[d.casa]?.compra} className="mt-0.5" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Venta</p>
                  <FlashPrice value={d.venta} formatted={formatArs(d.venta)} className="text-lg font-bold" />
                  <DayChangeBadge current={d.venta} previous={ayer?.[d.casa]?.venta} className="mt-0.5 justify-end" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-lg bg-black/30 px-4 py-3 ring-1 ring-inset ring-white/10">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-300"
        >
          <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8h.01M11 12h1v4h1" />
        </svg>
        <p className="text-xs text-slate-200">
          Cotizaciones de referencia con fines exclusivamente informativos. No constituyen una
          recomendación u oferta de compra/venta de divisas. Verificar condiciones con la entidad
          correspondiente antes de operar.
        </p>
      </div>
    </div>
  )
}
