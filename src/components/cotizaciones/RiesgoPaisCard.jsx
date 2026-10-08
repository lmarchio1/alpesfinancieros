import { useState } from 'react'
import Card from '../ui/Card'
import DayChangeBadge from '../ui/DayChangeBadge'
import HistoriaModal from '../ui/HistoriaModal'
import { useCountUp } from '../../hooks/useCountUp'
import { useEsMovil } from '../../hooks/useEsMovil'
import { fetchHistoriaRiesgoPais, fetchRiesgoPaisAnterior } from '../../services/rentaFijaApi'
import { usePolling } from '../../hooks/usePolling'

// Los mismos rangos que la tendencia de Reservas: hasta 4 años.
const RANGOS = [
  { id: '6m', etiqueta: '6 meses', meses: 6 },
  { id: '1a', etiqueta: '1 año', meses: 12 },
  { id: '2a', etiqueta: '2 años', meses: 24 },
  { id: '4a', etiqueta: '4 años', meses: 48 },
]

const formatPb = (v) => `${Math.round(v).toLocaleString('es-AR')} pb`

const formatFecha = (fechaIso) => {
  const d = new Date(fechaIso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

export default function RiesgoPaisCard({ riesgoPais }) {
  const animatedValor = useCountUp(riesgoPais.valor)
  const esMovil = useEsMovil()
  const [historiaAbierta, setHistoriaAbierta] = useState(false)

  // Ver comentario en ReservasCard.jsx: el intervalo corto es para autocorregir
  // un fallo transitorio, no por necesidad de frescura (el cierre de ayer no cambia).
  const { data: anterior } = usePolling(fetchRiesgoPaisAnterior, {
    intervalMs: 5 * 60 * 1000,
    persistKey: 'riesgo_pais_anterior',
  })

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
          <p className="font-semibold text-slate-900">Riesgo País (EMBI+ Argentina)</p>
          <button
            type="button"
            onClick={() => setHistoriaAbierta(true)}
            aria-label="Ver la evolución del riesgo país"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 transition-colors hover:bg-orange-600 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 3 6-7M18 8h3v3" />
            </svg>
          </button>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Al cierre: {formatFecha(riesgoPais.fecha)}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-slate-900">{animatedValor} pb</p>
        <DayChangeBadge current={riesgoPais.valor} previous={anterior?.valor} />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Diferencial de rendimiento de la deuda soberana frente a los bonos del Tesoro de EE. UU.
      </p>

      {historiaAbierta && (
        <HistoriaModal
          onClose={() => setHistoriaAbierta(false)}
          titulo="Riesgo País (EMBI+ Argentina)"
          subtitulo="Diferencial contra los bonos del Tesoro de EE.UU., en puntos básicos · cierre diario"
          cargar={fetchHistoriaRiesgoPais}
          rangos={RANGOS}
          rangoInicial="2a"
          color="#ea580c"
          formatoValor={formatPb}
          formatoEje={(v) => Math.round(v).toLocaleString('es-AR')}
          esMovil={esMovil}
        />
      )}
    </Card>
  )
}
