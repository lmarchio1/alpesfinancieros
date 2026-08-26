import { useCallback, useState } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { fetchOtrasMonedas } from '../../services/forexApi'
import Card from '../ui/Card'
import Badge from '../ui/Badge'

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
// "USD 1,862.98" en vez del símbolo "$" (que se confunde con el "$" de
// pesos que ya aparece arriba, en la misma tarjeta).
const formatUsd = (value, decimales = 2) =>
  `USD ${value.toLocaleString('en-US', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`

const MONEDAS_INFO = {
  EUR: { nombre: 'Euro', simbolo: '€', unidad: 1, decimalesUsd: 4, decimalesInverso: 4, icon: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' },
  GBP: { nombre: 'Libra Esterlina', simbolo: '£', unidad: 1, decimalesUsd: 4, decimalesInverso: 4, icon: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white' },
  BRL: { nombre: 'Real Brasileño', simbolo: 'R$', unidad: 1, decimalesUsd: 4, decimalesInverso: 4, icon: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' },
  CLP: { nombre: 'Peso Chileno', simbolo: 'CLP', unidad: 1000, decimalesUsd: 2, decimalesInverso: 0, icon: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white' },
  COP: { nombre: 'Peso Colombiano', simbolo: 'COP', unidad: 1000, decimalesUsd: 2, decimalesInverso: 0, icon: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white' },
  UYU: { nombre: 'Peso Uruguayo', simbolo: '$U', unidad: 1, decimalesUsd: 4, decimalesInverso: 2, icon: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white' },
}

const METALES_INFO = {
  XAU: { nombre: 'Oro', simbolo: 'Au', icon: 'bg-amber-50 text-amber-700 group-hover:bg-amber-700 group-hover:text-white' },
  XAG: { nombre: 'Plata', simbolo: 'Ag', icon: 'bg-slate-100 text-slate-500 group-hover:bg-slate-500 group-hover:text-white' },
  XPT: { nombre: 'Platino', simbolo: 'Pt', icon: 'bg-cyan-50 text-cyan-700 group-hover:bg-cyan-700 group-hover:text-white' },
}

const formatFecha = (fechaIso) =>
  new Date(`${fechaIso}T00:00:00Z`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

// La fuente publica el archivo con la fecha de publicación, pero el
// contenido es el cierre del día hábil anterior a esa fecha.
const fechaCierre = (fechaIso) => {
  const d = new Date(`${fechaIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export default function OtrasMonedasTab() {
  const fetcher = useCallback(() => fetchOtrasMonedas(), [])
  const { data, error, loading, refresh } = usePolling(fetcher, { intervalMs: 60 * 60 * 1000 })
  const [inverso, setInverso] = useState(false)

  // Si ya se cargó bien una vez, un error transitorio en una actualización en
  // segundo plano no debe hacer desaparecer el contenido.
  if (!data && loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
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
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 shadow-md shadow-black/30">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-white">
          <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c2.2 2.4 3.5 5.5 3.5 9s-1.3 6.6-3.5 9c-2.2-2.4-3.5-5.5-3.5-9s1.3-6.6 3.5-9z" />
        </svg>
        <span className="text-sm font-bold uppercase tracking-wide text-white">Divisas Globales</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative grid grid-cols-2 rounded-full bg-slate-900/50 p-1 text-sm shadow-inner ring-1 ring-white/10 backdrop-blur-sm">
            <span
              aria-hidden="true"
              className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-brand-600 shadow-md shadow-black/40 transition-transform duration-300 ease-out"
              style={{ transform: inverso ? 'translateX(calc(100% + 8px))' : 'translateX(0)' }}
            />
            <button
              type="button"
              onClick={() => setInverso(false)}
              className={`relative z-10 whitespace-nowrap rounded-full px-3 py-1.5 font-semibold transition-colors duration-300 ${
                !inverso ? 'text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Moneda → $
            </button>
            <button
              type="button"
              onClick={() => setInverso(true)}
              className={`relative z-10 whitespace-nowrap rounded-full px-3 py-1.5 font-semibold transition-colors duration-300 ${
                inverso ? 'text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              US$ → Moneda
            </button>
          </div>
          <Badge variant="info">Actualización diaria</Badge>
        </div>
        <div className="flex items-center gap-3 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 shadow-sm backdrop-blur-sm">
          {data.fecha && <span>Cierre del {formatFecha(fechaCierre(data.fecha))}</span>}
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
          const pct = inverso ? m.variacionPctInverso : m.variacionPct
          const trendBorder = pct === null ? '!border-t-slate-200' : pct >= 0 ? '!border-t-emerald-700' : '!border-t-rose-700'
          return (
            <Card
              key={m.codigo}
              className={`group animate-fade-up border-t-4 p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none ${trendBorder}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all duration-300 ease-out group-hover:scale-110 ${info.icon}`}>
                    {info.simbolo}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{info.nombre}</p>
                    <p className="text-xs text-slate-400">{inverso ? `US$ → ${m.codigo}` : `Cada ${etiqueta}`}</p>
                  </div>
                </div>
                {pct !== null && (
                  <Badge variant={pct >= 0 ? 'positive' : 'negative'}>
                    {pct >= 0 ? '+' : ''}
                    {pct.toFixed(2)}%
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

      <div className="mb-5 mt-8 inline-flex items-center gap-2 rounded-full bg-[#dba61f] px-4 py-2 shadow-md shadow-black/30">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-slate-900">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 18h14l-2-9H7l-2 9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l1.3-2h5.4l1.3 2" />
        </svg>
        <span className="text-sm font-bold uppercase tracking-wide text-slate-900">Metales</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {data.metales.map((m, i) => {
          const info = METALES_INFO[m.codigo]
          const pct = m.variacionPct
          const trendBorder = pct === null ? '!border-t-slate-200' : pct >= 0 ? '!border-t-emerald-700' : '!border-t-rose-700'
          return (
            <Card
              key={m.codigo}
              className={`group animate-fade-up border-t-4 p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none ${trendBorder}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all duration-300 ease-out group-hover:scale-110 ${info.icon}`}>
                    {info.simbolo}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{info.nombre}</p>
                    <p className="text-xs text-slate-400">Precio por onza troy</p>
                  </div>
                </div>
                {pct !== null && (
                  <Badge variant={pct >= 0 ? 'positive' : 'negative'}>
                    {pct >= 0 ? '+' : ''}
                    {pct.toFixed(2)}%
                  </Badge>
                )}
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-500">En dólares</p>
                <p className="text-2xl font-bold text-slate-900">{formatUsd(m.usd, 2)}</p>
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
          Valores de referencia actualizados diariamente con fines informativos. No constituyen una
          recomendación operativa ni sustituyen la cotización de liquidación provista por cada
          entidad bancaria.
        </p>
      </div>
    </div>
  )
}
