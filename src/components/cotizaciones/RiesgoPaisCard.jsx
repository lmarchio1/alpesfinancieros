import Card from '../ui/Card'
import Badge from '../ui/Badge'

export default function RiesgoPaisCard({ riesgoPais }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <p className="text-sm text-slate-500">Riesgo país (EMBI+ Argentina)</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{riesgoPais.valor} pb</p>
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
