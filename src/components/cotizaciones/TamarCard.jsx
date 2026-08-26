import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import DayChangeBadge from '../ui/DayChangeBadge'
import { fetchTamar } from '../../services/bcraApi'
import { fetchConReintento } from '../../utils/fetchRetry'

const formatFecha = (fechaIso) => {
  const d = new Date(fechaIso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

export default function TamarCard() {
  const [tamar, setTamar] = useState(null)
  useEffect(() => {
    fetchConReintento(fetchTamar)
      .then(setTamar)
      .catch(() => setTamar(null))
  }, [])

  if (!tamar) return null

  return (
    <Card
      className="group animate-fade-up border-t-4 !border-t-violet-200 p-6 hover:!border-t-violet-500 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)]"
      style={{ animationDelay: '240ms' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <circle cx="7" cy="7" r="3" />
              <circle cx="17" cy="17" r="3" />
              <path strokeLinecap="round" d="M17 7L7 17" />
            </svg>
          </div>
          <p className="font-semibold text-slate-900">TAMAR (BCRA)</p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Al cierre: {formatFecha(tamar.fecha)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">TNA</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900">{tamar.valor.toFixed(2)}%</p>
            <DayChangeBadge current={tamar.valor} previous={tamar.valorAnterior} />
          </div>
        </div>
        {tamar.tea !== null && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">TEA</p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-slate-900">{tamar.tea.toFixed(2)}%</p>
              <DayChangeBadge current={tamar.tea} previous={tamar.teaAnterior} />
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Tasa de referencia del BCRA para depósitos del segmento corporativo e institucional
        (operaciones desde $1.000M).
      </p>
    </Card>
  )
}
