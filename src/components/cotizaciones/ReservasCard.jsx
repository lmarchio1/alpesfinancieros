import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import DayChangeBadge from '../ui/DayChangeBadge'
import { fetchReservasInternacionales } from '../../services/bcraApi'
import { fetchConReintento } from '../../utils/fetchRetry'

const formatMillones = (valor) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor)

const formatFecha = (fechaIso) => {
  const d = new Date(fechaIso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

export default function ReservasCard() {
  const [reservas, setReservas] = useState(null)
  useEffect(() => {
    fetchConReintento(fetchReservasInternacionales)
      .then(setReservas)
      .catch(() => setReservas(null))
  }, [])

  if (!reservas) return null

  return (
    <Card
      className="group animate-fade-up border-t-4 !border-t-[#f4e4bc] p-6 hover:!border-t-[#dba61f] transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)]"
      style={{ animationDelay: '80ms' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fdf6e3] text-[#dba61f] transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-[#dba61f] group-hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 18h14l-2-9H7l-2 9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l1.3-2h5.4l1.3 2" />
            </svg>
          </div>
          <p className="font-semibold text-slate-900">Reservas brutas (BCRA)</p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Al cierre: {formatFecha(reservas.fecha)}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-slate-900">USD {formatMillones(reservas.valor)} M</p>
        <DayChangeBadge current={reservas.valor} previous={reservas.valorAnterior} />
      </div>
      <p className="mt-1 text-xs text-slate-400">Reservas Internacionales del BCRA expresada en millones de USD.</p>
    </Card>
  )
}
