import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Card from '../ui/Card'
import DayChangeBadge from '../ui/DayChangeBadge'
import { fetchReservasInternacionales, fetchReservasSerie } from '../../services/bcraApi'
import { usePolling } from '../../hooks/usePolling'
import { fetchConReintento } from '../../utils/fetchRetry'

const formatMillones = (valor) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor)

const formatFecha = (fechaIso) => {
  const d = new Date(fechaIso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

const formatFechaCorta = (fechaIso) => {
  const d = new Date(fechaIso)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

const ANCHO = 640
const ALTO = 280
const MARGEN = { top: 12, right: 16, bottom: 34, left: 68 }
const ANCHO_PLOT = ANCHO - MARGEN.left - MARGEN.right
const ALTO_PLOT = ALTO - MARGEN.top - MARGEN.bottom
const CANT_TICKS_Y = 4
const CANT_TICKS_X = 6

const formatFechaEje = (fechaIso) => {
  const d = new Date(fechaIso)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCFullYear()).slice(2)}`
}

// Gráfico de tendencia a mano con SVG (sin librería de gráficos, igual que el resto
// de los íconos del sitio): eje Y (millones de USD) con grilla horizontal, eje X
// (fechas) con marcas espaciadas parejo. Funciona igual de bien con 30 puntos que
// con 480 (2 años) -el eje X solo toma ~6 muestras de la serie para las etiquetas,
// no depende de cuántos puntos tenga la línea-.
function GraficoTendencia({ serie }) {
  if (!serie || serie.length < 2) return null

  const valores = serie.map((d) => d.valor)
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = max - min || 1
  const iMin = valores.indexOf(min)
  const iMax = valores.indexOf(max)

  const puntoXY = (d, i) => {
    const x = MARGEN.left + (i / (serie.length - 1)) * ANCHO_PLOT
    const y = MARGEN.top + ALTO_PLOT - ((d.valor - min) / rango) * ALTO_PLOT
    return [x, y]
  }
  const puntos = serie.map((d, i) => puntoXY(d, i).map((n) => n.toFixed(1)).join(',')).join(' ')
  const [xMin, yMin] = puntoXY(serie[iMin], iMin)
  const [xMax, yMax] = puntoXY(serie[iMax], iMax)

  const ticksY = Array.from({ length: CANT_TICKS_Y + 1 }, (_, i) => min + (rango * i) / CANT_TICKS_Y)
  const indicesX = Array.from({ length: CANT_TICKS_X }, (_, i) =>
    Math.round((i / (CANT_TICKS_X - 1)) * (serie.length - 1))
  )

  return (
    <div>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-64 w-full" preserveAspectRatio="none">
        {/* Grilla y etiquetas del eje Y */}
        {ticksY.map((v) => {
          const y = MARGEN.top + ALTO_PLOT - ((v - min) / rango) * ALTO_PLOT
          return (
            <g key={v}>
              <line x1={MARGEN.left} x2={ANCHO - MARGEN.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={MARGEN.left - 8} y={y} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[10px]">
                {formatMillones(v)}
              </text>
            </g>
          )
        })}

        {/* Etiquetas del eje X */}
        {indicesX.map((i) => {
          const [x] = puntoXY(serie[i], i)
          return (
            <text
              key={i}
              x={x}
              y={ALTO - MARGEN.bottom + 18}
              textAnchor="middle"
              className="fill-slate-400 text-[10px]"
            >
              {formatFechaEje(serie[i].fecha)}
            </text>
          )
        })}

        <polyline
          points={puntos}
          fill="none"
          stroke="#dba61f"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={xMin} cy={yMin} r="4" fill="#e11d48" />
        <circle cx={xMax} cy={yMax} r="4" fill="#059669" />
      </svg>
      <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-slate-400">
        Millones de USD (eje Y) · Fecha (eje X)
      </p>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-600" />
          Mínimo: <strong className="text-slate-900">USD {formatMillones(min)} M</strong>
          <span className="text-slate-400">({formatFechaCorta(serie[iMin].fecha)})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          Máximo: <strong className="text-slate-900">USD {formatMillones(max)} M</strong>
          <span className="text-slate-400">({formatFechaCorta(serie[iMax].fecha)})</span>
        </span>
      </div>
    </div>
  )
}

function ModalTendencia({ onClose, serie, cargando }) {
  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Portal a document.body: si el modal se renderiza dentro del árbol de la tarjeta
  // (que tiene "transform" por el efecto hover de agrandarse), position:fixed deja de
  // ser relativo a la pantalla y pasa a serlo respecto a la tarjeta -confirmado en
  // vivo: el modal quedaba encerrado en el recuadro de la tarjeta en vez de cubrir
  // toda la pantalla-. El portal lo saca de ese árbol por completo.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">Reservas Internacionales (BCRA)</p>
            <p className="text-xs text-slate-500">Últimos 2 años, valores al cierre de cada publicación</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-5">
          {cargando && <div className="h-56 animate-pulse rounded bg-slate-100" />}
          {!cargando && serie && <GraficoTendencia serie={serie} />}
          {!cargando && !serie && (
            <p className="text-sm text-rose-500">No se pudo cargar la tendencia, probá de nuevo en un momento.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
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

  const [modalAbierto, setModalAbierto] = useState(false)
  const [serie, setSerie] = useState(null)
  const [cargandoSerie, setCargandoSerie] = useState(false)

  const abrirTendencia = () => {
    setModalAbierto(true)
    if (!serie) {
      setCargandoSerie(true)
      fetchConReintento(fetchReservasSerie)
        .then(setSerie)
        .catch(() => setSerie(null))
        .finally(() => setCargandoSerie(false))
    }
  }

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
          <button
            type="button"
            onClick={abrirTendencia}
            aria-label="Ver tendencia de los últimos 2 años"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-[#fdf6e3] hover:text-[#dba61f]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 3 6-7M18 8h3v3" />
            </svg>
          </button>
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

      {modalAbierto && (
        <ModalTendencia onClose={() => setModalAbierto(false)} serie={serie} cargando={cargandoSerie} />
      )}
    </Card>
  )
}
