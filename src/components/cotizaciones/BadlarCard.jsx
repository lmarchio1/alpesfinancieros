import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import DayChangeBadge from '../ui/DayChangeBadge'
import { fetchBadlar } from '../../services/bcraApi'
import { fetchConReintento } from '../../utils/fetchRetry'

const formatFecha = (fechaIso) => {
  const d = new Date(fechaIso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

export default function BadlarCard() {
  const [badlar, setBadlar] = useState(null)
  useEffect(() => {
    fetchConReintento(fetchBadlar)
      .then(setBadlar)
      .catch(() => setBadlar(null))
  }, [])

  if (!badlar) return null

  return (
    <Card className="group border-t-4 !border-t-violet-200 p-6 hover:!border-t-violet-800 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-violet-800 group-hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <circle cx="7" cy="7" r="3" />
              <circle cx="17" cy="17" r="3" />
              <path strokeLinecap="round" d="M17 7L7 17" />
            </svg>
          </div>
          <p className="font-semibold text-slate-900">BADLAR (BCRA)</p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Al cierre: {formatFecha(badlar.fecha)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">TNA</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900">{badlar.valor.toFixed(2)}%</p>
            <DayChangeBadge current={badlar.valor} previous={badlar.valorAnterior} />
          </div>
        </div>
        {badlar.tea !== null && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">TEA</p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-slate-900">{badlar.tea.toFixed(2)}%</p>
              <DayChangeBadge current={badlar.tea} previous={badlar.teaAnterior} />
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Tasa promedio para depósitos a plazo fijo mayoristas en bancos privados (estrato superior a
        $1M, plazo 30-35 días).
      </p>
    </Card>
  )
}
