import { useCallback, useMemo, useState } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { fetchExpectativaInflacionREM } from '../../services/remApi'
import { fetchTasaPlazoFijo30Dias, fetchInflacionMensual } from '../../services/bcraApi'
import { valorActualizado, factorAcumulado, mesesEnRango, inflacionInteranual } from '../../utils/inflacionMath'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import DayChangeBadge from '../ui/DayChangeBadge'
import MonthPicker from '../ui/MonthPicker'

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)

const formatMes = (yearMonth) => {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

const formatFecha = (fechaIso) => {
  const d = new Date(fechaIso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
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
  const { data, error, loading, updatedAt, refresh } = usePolling(fetcher, {
    intervalMs: 30 * 60 * 1000,
    persistKey: 'inflacion',
  })

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

  // Acumulada de enero a hoy, para mostrar al lado de la interanual -mismo motor que
  // usa la calculadora de abajo, pero con un rango fijo (no el que el usuario elija ahí).
  const acumuladaAnioActual = useMemo(() => {
    if (!data) return null
    const factor = factorAcumulado(data, eneroAnioActual(), mesActual())
    return (factor - 1) * 100
  }, [data])

  // Ver comentario en ReservasCard.jsx: el intervalo corto es para autocorregir un
  // fallo transitorio, no por necesidad de frescura (ninguno de los dos cambia
  // seguido: el REM es mensual, el plazo fijo lo publica el BCRA 1 vez/día).
  const { data: rem } = usePolling(fetchExpectativaInflacionREM, {
    intervalMs: 5 * 60 * 1000,
    persistKey: 'expectativa_inflacion_rem',
  })

  const { data: plazoFijo } = usePolling(fetchTasaPlazoFijo30Dias, {
    intervalMs: 5 * 60 * 1000,
    persistKey: 'plazo_fijo_30d',
  })

  // Si ya se cargó bien una vez, un error transitorio en una actualización en
  // segundo plano no debe hacer desaparecer el contenido.
  if (!data && loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  if (!data && error) {
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
        <Badge variant="positive">Fuente: BCRA</Badge>
        <div className="flex items-center gap-3 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 shadow-sm backdrop-blur-sm">
          {updatedAt && <span>Actualizado {updatedAt.toLocaleTimeString('es-AR')}</span>}
          <button type="button" onClick={refresh} className="font-semibold text-brand-300 hover:text-white hover:underline">
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          {interanual !== null ? (
            <Card className="group h-full border-t-4 !border-t-brand-300 p-6 hover:!border-t-brand-500 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M15 7h6v6" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-900">Inflación Interanual</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Últimos 12 meses</p>
                  <p className="mt-0.5 text-3xl font-bold text-slate-900">{interanual.toFixed(2)}%</p>
                </div>
                {acumuladaAnioActual !== null && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Acumulada {new Date().getFullYear()}
                    </p>
                    <p className="mt-0.5 text-3xl font-bold text-slate-900">{acumuladaAnioActual.toFixed(2)}%</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Variación acumulada del Índice de Precios al Consumidor (IPC Nacional) publicada por
                INDEC.
              </p>
            </Card>
          ) : (
            <div className="h-[122px] animate-pulse rounded-2xl bg-slate-100 sm:h-[223px]" />
          )}
        </div>

        <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
          {rem ? (
            <Card className="group h-full border-t-4 !border-t-[#d4a465] p-6 hover:!border-t-[#c17a1e] transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fbeed6] text-[#c17a1e] transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-[#c17a1e] group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-2 6-6 2 2-6 6-2z" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-900">Inflación Esperada (REM · BCRA)</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Próximos 12 meses</p>
                  <p className="mt-0.5 text-3xl font-bold text-slate-900">{rem.proximos12MesesPct.toFixed(2)}%</p>
                </div>
                {rem.anioActual && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {rem.anioActual.anio} completo
                    </p>
                    <p className="mt-0.5 text-3xl font-bold text-slate-900">{rem.anioActual.pct.toFixed(2)}%</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Mediana proyectada según el Relevamiento de Expectativas de Mercado.
              </p>
            </Card>
          ) : (
            <div className="h-[193px] animate-pulse rounded-2xl bg-slate-100 sm:h-[223px]" />
          )}
        </div>

        <div className="animate-fade-up" style={{ animationDelay: '160ms' }}>
          {plazoFijo ? (
            <Card className="group h-full border-t-4 !border-t-[#7fa88a] p-6 hover:!border-t-emerald-500 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 3M12 3a9 9 0 100 18 9 9 0 000-18z" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-900">Plazo Fijo a 30 Días (BCRA)</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">TNA</p>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-slate-900">{plazoFijo.valor.toFixed(2)}%</p>
                    <DayChangeBadge current={plazoFijo.valor} previous={plazoFijo.valorAnterior} />
                  </div>
                </div>
                {plazoFijo.tea !== null && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">TEA</p>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-slate-900">{plazoFijo.tea.toFixed(2)}%</p>
                      <DayChangeBadge current={plazoFijo.tea} previous={plazoFijo.teaAnterior} />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Tasa pasiva de referencia del sistema financiero para colocaciones a 30 días en
                  plazos fijos.
                </p>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                  Al cierre: {formatFecha(plazoFijo.fecha)}
                </span>
              </div>
            </Card>
          ) : (
            <div className="h-[235px] animate-pulse rounded-2xl bg-slate-100 sm:h-[223px]" />
          )}
        </div>
      </div>

      <div className="mt-4">
        <Card className="animate-fade-up !bg-slate-50 p-6" style={{ animationDelay: '240ms' }}>
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
                <div className="min-w-0 rounded-xl bg-brand-700 p-4">
                  <p className="text-xs text-white/70">Capital equivalente actualizado</p>
                  <p className="break-words text-xl font-bold text-white sm:text-2xl">
                    {formatArs(resultado.valorHoy)}
                  </p>
                </div>
                <div className="min-w-0 rounded-xl bg-orange-400 p-4">
                  <p className="text-xs text-slate-900/70">Inflación acumulada</p>
                  <p className="break-words text-xl font-bold text-slate-900 sm:text-2xl">
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
        </Card>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-black/30 px-4 py-3 ring-1 ring-inset ring-white/10">
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
            Cálculo estimado en base al Índice de Precios al Consumidor (IPC - INDEC). Herramienta
            analítica con fines históricos y didácticos para medir la variación del poder
            adquisitivo. No constituye una proyección a futuro ni recomendación operativa.
          </p>
        </div>
      </div>
    </div>
  )
}
