import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { fetchReservasInternacionales } from '../../services/bcraApi'

const formatMillones = (valor) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor)

export default function ReservasCard() {
  const [reservas, setReservas] = useState(null)
  useEffect(() => {
    fetchReservasInternacionales()
      .then(setReservas)
      .catch(() => setReservas(null))
  }, [])

  if (!reservas) return null

  return (
    <Card className="group flex flex-wrap items-center justify-between gap-4 border-t-4 border-[#dba61f] p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fdf6e3] text-[#dba61f] transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-[#dba61f] group-hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.5v11M15.5 9.8c0-1.7-1.6-2.8-3.5-2.8s-3.5 1.1-3.5 2.8c0 3.4 7 1.7 7 5 0 1.7-1.6 2.8-3.5 2.8s-3.5-1.1-3.5-2.8"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm text-slate-500">Reservas brutas (BCRA)</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">USD {formatMillones(reservas.valor)} M</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="positive">● En vivo · BCRA</Badge>
        <span className="text-xs text-slate-400">
          {new Date(reservas.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
        </span>
      </div>
    </Card>
  )
}
