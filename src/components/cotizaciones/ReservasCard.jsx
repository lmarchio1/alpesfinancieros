import Card from '../ui/Card'
import DayChangeBadge from '../ui/DayChangeBadge'
import { fetchReservasInternacionales } from '../../services/bcraApi'
import { usePolling } from '../../hooks/usePolling'

const formatMillones = (valor) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor)

const formatFecha = (fechaIso) => {
  const d = new Date(fechaIso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

export default function ReservasCard() {
  // intervalMs corto (5 min) no es para "frescura" -el BCRA publica una vez por
  // día- sino para que un fallo transitorio (conexión inestable, hiccup de
  // Supabase/BCRA) se autocorrija solo en la siguiente rueda, en vez de dejar la
  // tarjeta en blanco hasta que alguien recargue la página a mano.
  const { data: reservas } = usePolling(fetchReservasInternacionales, {
    intervalMs: 5 * 60 * 1000,
    persistKey: 'reservas_bcra',
  })

  if (!reservas) return null

  return (
    <Card
      className="group animate-fade-up border-t-4 !border-t-[#eccb84] p-6 hover:!border-t-[#dba61f] transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)]"
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
          <p className="font-semibold text-slate-900">Reservas Brutas (BCRA)</p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Al cierre: {formatFecha(reservas.fecha)}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-slate-900">USD {formatMillones(reservas.valor)} M</p>
        <DayChangeBadge current={reservas.valor} previous={reservas.valorAnterior} />
      </div>
      <p className="mt-1 text-xs text-slate-500">Reservas Internacionales del BCRA expresada en millones de USD.</p>
    </Card>
  )
}
