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
        <div className="flex items-center gap-3 text-xs text-slate-300">
          {updatedAt && <span>Actualizado {updatedAt.toLocaleTimeString('es-AR')}</span>}
          <button type="button" onClick={refresh} className="font-medium text-brand-300 hover:text-white hover:underline">
            Actualizar
          </button>
        </div>
      </div>

      {banda && (
        <Card className="mb-4 overflow-hidden border-t-4 border-brand-500 p-0">
          <div className="bg-gradient-to-br from-brand-50 via-white to-[#fbeed6]/40 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V10l6-6 6 6v11M10 21v-6h4v6" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Banda cambiaria hoy</p>
                <p className="text-xs text-slate-400">BCRA · se ajusta a diario con la inflación</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 items-end gap-4 sm:grid-cols-[auto_1fr_auto]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Piso</p>
                <p className="mt-0.5 text-xl font-bold text-emerald-600">{formatArsEntero(banda.piso)}</p>
              </div>

              <div className="order-3 col-span-2 pt-3 sm:order-none sm:col-span-1 sm:px-5 sm:pt-6">
                <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-emerald-400 via-slate-300 to-rose-400 shadow-inner ring-1 ring-black/10">
                  {bandaPct !== null && (
                    <div
                      className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                      style={{ left: `${bandaPct}%` }}
                    >
                      <span className="mb-1.5 whitespace-nowrap rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                        Mayorista {formatArsEntero(mayorista.venta)}
                        {faltaParaTecho !== null && (
                          <span className="ml-1 font-normal text-slate-300">
                            · falta {faltaParaTecho.toFixed(1)}% para el techo
                          </span>
                        )}
                      </span>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-600 shadow" />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Techo</p>
                <p className="mt-0.5 text-xl font-bold text-rose-600">{formatArsEntero(banda.techo)}</p>
              </div>
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
                <h3 className="font-semibold text-slate-900">{d.nombre}</h3>
                {brecha !== null ? (
                  <Badge variant="brand">
                    {brecha >= 0 ? '+' : ''}
                    {brecha.toFixed(1)}% vs mayorista
                  </Badge>
                ) : (
                  <Badge variant="neutral">referencia</Badge>
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

      <p className="mt-5 text-xs text-slate-300">
        Cotizaciones de referencia, a título informativo. No constituyen asesoramiento ni una
        recomendación de inversión — verificá siempre con tu banco o casa de cambio antes de operar.
      </p>
    </div>
  )
}
