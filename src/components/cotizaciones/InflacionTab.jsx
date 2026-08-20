import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { fetchInflacionMensual } from '../../services/inflacionApi'
import { fetchExpectativaInflacionREM } from '../../services/remApi'
import { fetchTasaPlazoFijo30Dias } from '../../services/bcraApi'
import { valorActualizado, factorAcumulado, mesesEnRango, inflacionInteranual } from '../../utils/inflacionMath'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import MonthPicker from '../ui/MonthPicker'

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)

const formatMes = (yearMonth) => {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

function mesActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function eneroAnioActual() {
  return `${new Date().getFullYear()}-01`
}

export default function InflacionTab() {
  const fetcher = useCallback(() => fetchInflacionMensual(), [])
  const { data, error, loading, updatedAt, refresh } = usePolling(fetcher, { intervalMs: 30 * 60 * 1000 })

  const [monto, setMonto] = useState('100000')
  const montoNumerico = monto === '' ? 0 : Number(monto)
  const [desde, setDesde] = useState(eneroAnioActual())
  const [hasta, setHasta] = useState(mesActual())

  const minMes = data?.[0]?.fecha.slice(0, 7)
  const maxMes = mesActual()

  const rangoValido = data && desde && hasta && desde <= hasta

  const resultado = useMemo(() => {
    if (!rangoValido) return null
    const factor = factorAcumulado(data, desde, hasta)
    return {
      valorHoy: valorActualizado(data, montoNumerico, desde, hasta),
      inflacionAcumuladaPct: (factor - 1) * 100,
    }
  }, [data, montoNumerico, desde, hasta, rangoValido])

  const detalleMensual = useMemo(() => {
    if (!rangoValido) return []
    return mesesEnRango(data, desde, hasta).slice().reverse()
  }, [data, desde, hasta, rangoValido])

  const interanual = useMemo(() => (data ? inflacionInteranual(data) : null), [data])

  const [rem, setRem] = useState(null)
  useEffect(() => {
    fetchExpectativaInflacionREM()
      .then(setRem)
      .catch(() => setRem(null))
  }, [])

  const [plazoFijo, setPlazoFijo] = useState(null)
  useEffect(() => {
    fetchTasaPlazoFijo30Dias()
      .then(setPlazoFijo)
      .catch(() => setPlazoFijo(null))
  }, [])

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
        <div className="flex items-center gap-3 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 shadow-sm backdrop-blur-sm">
          {updatedAt && <span>Actualizado {updatedAt.toLocaleTimeString('es-AR')}</span>}
          <button type="button" onClick={refresh} className="font-semibold text-brand-300 hover:text-white hover:underline">
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {interanual !== null && (
          <Card className="group border-t-4 border-brand-500 p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M15 7h6v6" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">Inflación interanual</p>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{interanual.toFixed(2)}%</p>
            <p className="mt-1 text-xs text-slate-400">Variación acumulada de los últimos 12 meses (Dato oficial INDEC).</p>
          </Card>
        )}

        {rem && (
          <Card className="group border-t-4 border-[#c17a1e] p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fbeed6] text-[#c17a1e] transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-[#c17a1e] group-hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-2 6-6 2 2-6 6-2z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">Inflación esperada (REM · BCRA)</p>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{rem.proximos12MesesPct.toFixed(2)}%</p>
            <p className="mt-1 text-xs text-slate-400">
              Mediana proyectada a 12 meses según el Relevamiento de Expectativas de Mercado.
              {rem.anioActual && ` · ${rem.anioActual.anio}: ${rem.anioActual.pct.toFixed(1)}%`}
            </p>
          </Card>
        )}

        {plazoFijo && (
          <Card className="group border-t-4 border-emerald-500 p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 3M12 3a9 9 0 100 18 9 9 0 000-18z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">Plazo fijo a 30 días (BCRA)</p>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{plazoFijo.valor.toFixed(2)}%</p>
            <p className="mt-1 text-xs text-slate-400">
              Tasa nominal anual de referencia del sistema financiero para colocaciones a 30 días.
            </p>
          </Card>
        )}
      </div>

      <div className="mt-4">
        <Card className="!bg-[#faf9f5] p-6">
          <h3 className="font-semibold text-slate-900">Evolución del Poder Adquisitivo</h3>
          <p className="mt-1 text-sm text-slate-500">
            Seleccione un período para evaluar el impacto inflacionario acumulado y el valor
            actualizado en términos reales del capital.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Monto inicial</label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-slate-500">$</span>
                <input
                  type="number"
                  min="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Período inicial</label>
              <MonthPicker value={desde} onChange={setDesde} min={minMes} max={maxMes} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Período final</label>
              <MonthPicker value={hasta} onChange={setHasta} min={minMes} max={maxMes} />
            </div>
          </div>

          {!rangoValido && (
            <p className="mt-4 text-sm text-rose-600">La fecha "Desde" tiene que ser anterior a "Hasta".</p>
          )}

          {resultado && (
            <>
              <p className="mt-6 text-sm text-slate-600">
                Inflación acumulada de <strong>{formatMes(desde)}</strong> a{' '}
                <strong>{formatMes(hasta)}</strong>:
              </p>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0 rounded-xl bg-brand-50 p-4">
                  <p className="text-xs text-slate-500">Capital equivalente actualizado</p>
                  <p className="break-words text-xl font-bold text-brand-600 sm:text-2xl">
                    {formatArs(resultado.valorHoy)}
                  </p>
                </div>
                <div className="min-w-0 rounded-xl bg-[#fbeed6] p-4">
                  <p className="text-xs text-slate-500">Inflación acumulada</p>
                  <p className="break-words text-xl font-bold text-[#a35f24] sm:text-2xl">
                    +{resultado.inflacionAcumuladaPct.toFixed(2)}%
                  </p>
                </div>
              </div>

              {detalleMensual.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mes a mes</p>
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-slate-100">
                        {detalleMensual.map((d) => (
                          <tr key={d.fecha} className="transition-colors hover:bg-brand-50/60">
                            <td className="px-4 py-2 capitalize text-slate-600">{formatMes(d.fecha.slice(0, 7))}</td>
                            <td
                              className={`px-4 py-2 text-right font-semibold ${
                                d.valor < 0 ? 'text-emerald-600' : 'text-slate-900'
                              }`}
                            >
                              {d.valor > 0 ? '+' : ''}
                              {d.valor.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          <p className="mt-5 text-xs text-slate-400">
            Cálculo estimado en base al Índice de Precios al Consumidor (IPC - INDEC). Herramienta
            analítica con fines históricos y didácticos para medir la variación del poder
            adquisitivo. No constituye una proyección a futuro ni recomendación operativa.
          </p>
        </Card>
      </div>
    </div>
  )
}
