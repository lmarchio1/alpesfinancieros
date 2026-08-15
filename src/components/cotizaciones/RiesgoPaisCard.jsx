import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import DayChangeBadge from '../ui/DayChangeBadge'
import { useCountUp } from '../../hooks/useCountUp'
import { fetchRiesgoPaisAnterior } from '../../services/rentaFijaApi'

export default function RiesgoPaisCard({ riesgoPais }) {
  const animatedValor = useCountUp(riesgoPais.valor)

  const [anterior, setAnterior] = useState(null)
  useEffect(() => {
    fetchRiesgoPaisAnterior()
      .then(setAnterior)
      .catch(() => setAnterior(null))
  }, [])

  return (
    <Card className="group flex flex-wrap items-center justify-between gap-4 border-t-4 border-orange-500 p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2 6 4-16 2 10 2-4h4" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-slate-500">Riesgo país (EMBI+ Argentina)</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-slate-900">{animatedValor} pb</p>
            <DayChangeBadge current={riesgoPais.valor} previous={anterior?.valor} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="positive">● En vivo · argentinadatos.com</Badge>
        <span className="text-xs text-slate-400">
          {new Date(riesgoPais.fecha).toLocaleDateString('es-AR')}
        </span>
      </div>
    </Card>
  )
}
