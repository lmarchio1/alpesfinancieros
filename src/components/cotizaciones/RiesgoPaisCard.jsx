import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import DayChangeBadge from '../ui/DayChangeBadge'
import { useCountUp } from '../../hooks/useCountUp'
import { fetchRiesgoPaisAnterior } from '../../services/rentaFijaApi'
import { fetchConReintento } from '../../utils/fetchRetry'

const formatFecha = (fechaIso) => {
  const d = new Date(fechaIso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

export default function RiesgoPaisCard({ riesgoPais }) {
  const animatedValor = useCountUp(riesgoPais.valor)

  const [anterior, setAnterior] = useState(null)
  useEffect(() => {
    fetchConReintento(fetchRiesgoPaisAnterior)
      .then(setAnterior)
      .catch(() => setAnterior(null))
  }, [])

  return (
    <Card
      className="group animate-fade-up border-t-4 !border-t-orange-300 p-6 hover:!border-t-orange-500 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)]"
      style={{ animationDelay: '0ms' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2 6 4-16 2 10 2-4h4" />
            </svg>
          </div>
          <p className="font-semibold text-slate-900">Riesgo país (EMBI+ Argentina)</p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Al cierre: {formatFecha(riesgoPais.fecha)}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-slate-900">{animatedValor} pb</p>
        <DayChangeBadge current={riesgoPais.valor} previous={anterior?.valor} />
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Diferencial de rendimiento de la deuda soberana frente a los bonos del Tesoro de EE. UU.
      </p>
    </Card>
  )
}
