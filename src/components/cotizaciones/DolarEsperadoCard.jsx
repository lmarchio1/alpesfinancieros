import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import { fetchDolarEsperadoREM } from '../../services/remApi'

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const formatMesCorto = (periodoDesde) => {
  const d = new Date(`${periodoDesde}T00:00:00Z`)
  return `${MESES_CORTOS[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`
}

export default function DolarEsperadoCard() {
  const [rem, setRem] = useState(null)
  useEffect(() => {
    fetchDolarEsperadoREM()
      .then(setRem)
      .catch(() => setRem(null))
  }, [])

  if (!rem) {
    return (
      <Card className="!bg-[#E9EEE7] p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-white/70" />
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-white/70" />
            <div className="h-3 w-72 animate-pulse rounded bg-white/70" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white/70" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="group !bg-[#E9EEE7] p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v12M15 9.5c0-1.5-1.5-2.5-3-2.5s-3 1-3 2.5c0 3 6 1.5 6 4.5 0 1.5-1.5 2.5-3 2.5s-3-1-3-2.5"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Dólar Esperado (REM)</h3>
          <p className="text-sm text-slate-500">
            Mediana de pronósticos de bancos y consultoras relevados por el BCRA para el tipo de
            cambio nominal, mes a mes.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {rem.meses.map((m, i) => {
          const anterior = rem.meses[i - 1]
          const momPct = anterior ? (m.mediana / anterior.mediana - 1) * 100 : null
          return (
            <div key={m.periodoDesde} className="rounded-xl bg-white p-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {formatMesCorto(m.periodoDesde)}
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatArs(m.mediana)}</p>
              {momPct !== null && (
                <p className="mt-0.5 text-xs font-medium text-emerald-600">
                  {momPct >= 0 ? '+' : ''}
                  {momPct.toFixed(2)}%
                </p>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Relevamiento de Expectativas de Mercado (REM), informe {rem.informe}. Refleja la opinión de un
        panel de analistas, no un precio de mercado negociable ni una proyección propia.
      </p>
    </Card>
  )
}
