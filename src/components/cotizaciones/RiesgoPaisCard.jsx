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
    <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <p className="text-sm text-slate-500">Riesgo país (EMBI+ Argentina)</p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-3xl font-bold text-slate-900">{animatedValor} pb</p>
          <DayChangeBadge current={riesgoPais.valor} previous={anterior?.valor} />
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
