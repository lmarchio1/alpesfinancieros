import { useEffect, useState } from 'react'
import Card from '../ui/Card'
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
    <Card className="group border-t-4 border-[#dba61f] p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fdf6e3] text-[#dba61f] transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-[#dba61f] group-hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 18h14l-2-9H7l-2 9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l1.3-2h5.4l1.3 2" />
          </svg>
        </div>
        <p className="font-semibold text-slate-900">Reservas brutas (BCRA)</p>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">USD {formatMillones(reservas.valor)} M</p>
      <p className="mt-1 text-xs text-slate-400">Reservas Internacionales del BCRA expresada en millones de USD.</p>
    </Card>
  )
}
