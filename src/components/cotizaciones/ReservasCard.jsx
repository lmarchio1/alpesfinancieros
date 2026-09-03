import { useEffect, useMemo, useState } from 'react'
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

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const formatMesAnio = (fechaIso) => {
  const d = new Date(fechaIso)
  return `${MESES_CORTOS[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`
}

// Etiquetas del eje X, ancladas al primer dato disponible de cada mes calendario
// (salteando de a N meses según el rango elegido), así las etiquetas caen en meses
// "redondos" de verdad (ene, jul, ene...) y no en fechas arbitrarias -mismo criterio
// que usa cualquier gráfico de fechas "de verdad", Excel incluido-.
function calcularTicksX(serie, rangoId) {
  const pasoMeses = rangoId === '6m' ? 1 : rangoId === '12m' ? 2 : 6
  const primera = new Date(serie[0].fecha)
  const ultima = serie[serie.length - 1].fecha
  const resultado = []
  let cursor = new Date(Date.UTC(primera.getUTCFullYear(), primera.getUTCMonth(), 1))
  while (true) {
    const cursorIso = cursor.toISOString().slice(0, 10)
    if (cursorIso > ultima) break
    const i = serie.findIndex((d) => d.fecha >= cursorIso)
    if (i !== -1) resultado.push({ i, label: formatMesAnio(serie[i].fecha) })
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + pasoMeses, 1))
  }
  // El último punto de la serie siempre se muestra, aunque no caiga justo en un
  // "mes redondo" -así el gráfico nunca corta sin aclarar hasta cuándo llega-. Si el
  // último tick "redondo" ya cae en el mismo mes que el último punto real, se
  // reemplaza en vez de agregar uno nuevo -si no, con pasoMeses=1 quedaban dos
  // etiquetas casi pegadas mostrando el mismo mes (ej. "ago-26" dos veces)-.
  const ultimoIndice = serie.length - 1
  const ultimoLabel = formatMesAnio(serie[ultimoIndice].fecha)
  if (resultado[resultado.length - 1]?.label === ultimoLabel) {
    resultado[resultado.length - 1] = { i: ultimoIndice, label: ultimoLabel }
  } else {
    resultado.push({ i: ultimoIndice, label: ultimoLabel })
  }
  return resultado
}

// Mil millones de USD (lo que en inglés es "billion"), con 1 decimal y coma
// decimal -formato profesional tipo Excel, no el número crudo con separador de miles-.
const formatMilesDeMillones = (valorEnMillones) =>
  (valorEnMillones / 1000).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const ANCHO = 640
const ALTO = 300
const MARGEN = { top: 12, right: 16, bottom: 44, left: 78 }
const ANCHO_PLOT = ANCHO - MARGEN.left - MARGEN.right
const ALTO_PLOT = ALTO - MARGEN.top - MARGEN.bottom
const CANT_TICKS_Y_OBJETIVO = 6

const RANGOS = [
  { id: '6m', label: '6 meses', dias: 182 },
  { id: '12m', label: '1 año', dias: 365 },
  { id: '2a', label: '2 años', dias: 730 },
  { id: '4a', label: '4 años', dias: 1460 },
]

// Escalones "lindos" para el eje Y (1, 2, 2.5, 5 o 10 × una potencia de 10), el mismo
// criterio que usa Excel/cualquier librería de gráficos profesional para no mostrar
// números arbitrarios como resultado de dividir el rango a lo bruto.
function pasoLindo(rango, ticksObjetivo) {
  const pasoCrudo = rango / ticksObjetivo
  const magnitud = Math.pow(10, Math.floor(Math.log10(pasoCrudo)))
  const residual = pasoCrudo / magnitud
  if (residual > 5) return 10 * magnitud
  if (residual > 2) return 5 * magnitud
  if (residual > 1) return 2 * magnitud
  return magnitud
}

function calcularTicksY(min, max) {
  const paso = pasoLindo(max - min || 1, CANT_TICKS_Y_OBJETIVO)
  const inicio = Math.floor(min / paso) * paso
  const fin = Math.ceil(max / paso) * paso
  const ticks = []
  for (let v = inicio; v <= fin + paso * 0.001; v += paso) ticks.push(v)
  return ticks
}

// Gráfico de tendencia a mano con SVG (sin librería de gráficos, igual que el resto
// de los íconos del sitio): eje Y en miles de millones de USD, con escalones parejos
// y grilla horizontal (estilo profesional/Excel); eje X con fechas espaciadas parejo.
// Recibe la serie completa (hasta 4 años, un solo pedido) y el rango elegido -el
// recorte es puramente en el navegador, cambiar de rango no dispara ningún pedido
// nuevo-.
function GraficoTendencia({ serieCompleta, rangoId }) {
  const [hoverIndex, setHoverIndex] = useState(null)
  useEffect(() => setHoverIndex(null), [rangoId])

  const serie = useMemo(() => {
    const dias = RANGOS.find((r) => r.id === rangoId).dias
    const corte = new Date()
    corte.setUTCDate(corte.getUTCDate() - dias)
    const corteIso = corte.toISOString().slice(0, 10)
    return serieCompleta.filter((d) => d.fecha >= corteIso)
  }, [serieCompleta, rangoId])

  if (serie.length < 2) {
    return <p className="text-sm text-slate-500">No hay suficientes publicaciones del BCRA en este rango.</p>
  }

  const valores = serie.map((d) => d.valor)
  const minValor = Math.min(...valores)
  const maxValor = Math.max(...valores)
  const iMin = valores.indexOf(minValor)
  const iMax = valores.indexOf(maxValor)

  // Los ticks se calculan en miles de millones (dividiendo por 1000) para que salgan
  // escalones lindos en esa unidad -en millones crudos, un "escalón lindo" quedaría
  // en múltiplos de 1000/2000/5000, que es exactamente lo mismo pero más difícil de
  // leer que "25,0 / 30,0 / 35,0"-.
  const ticksY = calcularTicksY(minValor / 1000, maxValor / 1000)
  const dominioMin = ticksY[0]
  const dominioMax = ticksY[ticksY.length - 1]
  const dominioRango = dominioMax - dominioMin || 1

  const puntoXY = (d, i) => {
    const x = MARGEN.left + (i / (serie.length - 1)) * ANCHO_PLOT
    const y = MARGEN.top + ALTO_PLOT - (d.valor / 1000 - dominioMin) / dominioRango * ALTO_PLOT
    return [x, y]
  }
  const puntos = serie.map((d, i) => puntoXY(d, i).map((n) => n.toFixed(1)).join(',')).join(' ')
  const [xMin, yMin] = puntoXY(serie[iMin], iMin)
  const [xMax, yMax] = puntoXY(serie[iMax], iMax)

  // Área sombreada bajo la línea: mismos puntos de la polyline, cerrando el path
  // hacia abajo (piso del gráfico) y de vuelta al primer punto -relleno con el
  // degradé amarillo-a-transparente definido en <defs>-.
  const yPiso = MARGEN.top + ALTO_PLOT
  const [xPrimero] = puntoXY(serie[0], 0)
  const [xUltimo] = puntoXY(serie[serie.length - 1], serie.length - 1)
  const areaPath = `M${xPrimero},${yPiso} L${puntos.split(' ').join(' L')} L${xUltimo},${yPiso} Z`

  const ticksX = calcularTicksX(serie, rangoId)

  return (
    <div>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-64 w-full sm:h-72" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gradienteReservas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dba61f" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#dba61f" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grilla y etiquetas del eje Y */}
        {ticksY.map((v) => {
          const y = MARGEN.top + ALTO_PLOT - ((v - dominioMin) / dominioRango) * ALTO_PLOT
          return (
            <g key={v}>
              <line x1={MARGEN.left} x2={ANCHO - MARGEN.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={MARGEN.left - 12} y={y} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[10px]">
                {v.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </text>
            </g>
          )
        })}

        {/* Título vertical del eje Y, rotado -90°, estilo Excel -oculto en mobile,
            ahí la unidad se aclara en el subtítulo del modal para no comerse
            espacio del gráfico en pantallas angostas-. */}
        <text
          x={16}
          y={MARGEN.top + ALTO_PLOT / 2}
          textAnchor="middle"
          transform={`rotate(-90, 16, ${MARGEN.top + ALTO_PLOT / 2})`}
          className="hidden fill-slate-500 text-[10px] font-semibold uppercase tracking-wide sm:block"
        >
          Miles de millones de USD
        </text>

        {/* Etiquetas del eje X: mes-año, ancladas al primer dato de cada mes. */}
        {ticksX.map((t) => {
          const [x] = puntoXY(serie[t.i], t.i)
          return (
            <text key={t.i} x={x} y={ALTO - MARGEN.bottom + 18} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {t.label}
            </text>
          )
        })}

        <path d={areaPath} fill="url(#gradienteReservas)" />
        <polyline
          points={puntos}
          fill="none"
          stroke="#dba61f"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Puntitos en cada publicación: el círculo visible es chico, pero el área
            que responde al mouse/toque es más grande (invisible) para que sea fácil
            de acertar, sobre todo en el celular. Hover o tap muestra un tooltip con
            la fecha exacta y el valor de ese día. */}
        {serie.map((d, i) => {
          const [x, y] = puntoXY(d, i)
          const espacioPunto = serie.length > 1 ? ANCHO_PLOT / (serie.length - 1) : ANCHO_PLOT
          return (
            <g key={d.fecha}>
              <circle cx={x} cy={y} r={hoverIndex === i ? 4 : 2} fill="#dba61f" className="transition-all" />
              <circle
                cx={x}
                cy={y}
                r={Math.max(7, espacioPunto / 2)}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={() => setHoverIndex(i)}
                className="cursor-pointer"
              />
            </g>
          )
        })}

        <circle cx={xMin} cy={yMin} r="4" fill="#e11d48" />
        <circle cx={xMax} cy={yMax} r="4" fill="#059669" />

        {hoverIndex !== null && serie[hoverIndex] && (
          (() => {
            const d = serie[hoverIndex]
            const [x, y] = puntoXY(d, hoverIndex)
            const anchoCaja = 96
            const xCaja = Math.min(Math.max(x - anchoCaja / 2, MARGEN.left), ANCHO - MARGEN.right - anchoCaja)
            const arribaOk = y - 34 > MARGEN.top
            const yCaja = arribaOk ? y - 34 : y + 12
            return (
              <g pointerEvents="none">
                <rect x={xCaja} y={yCaja} width={anchoCaja} height={26} rx="5" fill="#1e293b" />
                <text x={xCaja + anchoCaja / 2} y={yCaja + 10} textAnchor="middle" className="fill-white text-[9px] font-semibold">
                  {formatFechaCorta(d.fecha)}
                </text>
                <text x={xCaja + anchoCaja / 2} y={yCaja + 20} textAnchor="middle" className="fill-white text-[10px] font-bold">
                  USD {formatMilesDeMillones(d.valor)} mil M
                </text>
              </g>
            )
          })()
        )}
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-600" />
          Mínimo: <strong className="text-slate-900">USD {formatMilesDeMillones(minValor)} mil M</strong>
          <span className="text-slate-400">({formatFechaCorta(serie[iMin].fecha)})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          Máximo: <strong className="text-slate-900">USD {formatMilesDeMillones(maxValor)} mil M</strong>
          <span className="text-slate-400">({formatFechaCorta(serie[iMax].fecha)})</span>
        </span>
      </div>
    </div>
  )
}

function ModalTendencia({ onClose, serieCompleta, cargando, onReintentar }) {
  const [rangoId, setRangoId] = useState('2a')

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">Reservas Internacionales (BCRA)</p>
            <p className="text-xs text-slate-500">
              Valores al cierre de cada publicación <span className="sm:hidden">(en miles de millones de USD)</span>
            </p>
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

        {/* Selector de rango: recorta la misma serie ya traída, no dispara pedidos
            nuevos. En mobile, grilla 2x2 -en una sola fila los 4 botones quedaban muy
            apretados para tocar con el dedo con comodidad-. */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-xs sm:inline-flex sm:gap-0">
          {RANGOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRangoId(r.id)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                rangoId === r.id ? 'bg-white text-[#a35f24] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {cargando && <div className="h-64 animate-pulse rounded bg-slate-100 sm:h-72" />}
          {!cargando && serieCompleta && <GraficoTendencia serieCompleta={serieCompleta} rangoId={rangoId} />}
          {!cargando && !serieCompleta && (
            <div className="text-center">
              <p className="text-sm text-rose-500">No se pudo cargar la tendencia. Puede ser un problema pasajero del BCRA.</p>
              <button
                type="button"
                onClick={onReintentar}
                className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Reintentar
              </button>
            </div>
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

  // Se pide una sola vez, al máximo rango (4 años) -no en la carga inicial de la
  // página, recién cuando se abre la tendencia-. Los botones de 30 días/12 meses/2
  // años solo recortan esta misma serie en el navegador, sin volver a pedir nada.
  // fetchConReintento ya reintenta 2 veces solo; si aun así falla (BCRA caído,
  // Supabase sin respuesta), el modal muestra un botón para reintentar a mano en
  // vez de quedar en un estado sin salida.
  const cargarSerie = () => {
    setCargandoSerie(true)
    fetchConReintento(() => fetchReservasSerie(1460))
      .then(setSerie)
      .catch(() => setSerie(null))
      .finally(() => setCargandoSerie(false))
  }

  const abrirTendencia = () => {
    setModalAbierto(true)
    if (!serie) cargarSerie()
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
            aria-label="Ver tendencia histórica"
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
        <ModalTendencia
          onClose={() => setModalAbierto(false)}
          serieCompleta={serie}
          cargando={cargandoSerie}
          onReintentar={cargarSerie}
        />
      )}
    </Card>
  )
}
