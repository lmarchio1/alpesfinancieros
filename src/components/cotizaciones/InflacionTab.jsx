import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePolling } from '../../hooks/usePolling'
import { fetchExpectativaInflacionREM } from '../../services/remApi'
import { fetchTasaPlazoFijo30Dias, fetchInflacionMensual } from '../../services/bcraApi'
import { valorActualizado, factorAcumulado, mesesEnRango, inflacionInteranual } from '../../utils/inflacionMath'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import DayChangeBadge from '../ui/DayChangeBadge'
import MonthPicker from '../ui/MonthPicker'

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const formatMesAnio = (fechaIso) => {
  const d = new Date(fechaIso)
  return `${MESES_CORTOS[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`
}
const formatFechaCorta = (fechaIso) => {
  const d = new Date(fechaIso)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

const ANCHO_G = 640
const ALTO_G = 300
const MARGEN_G = { top: 12, right: 16, bottom: 44, left: 56 }
const ANCHO_PLOT_G = ANCHO_G - MARGEN_G.left - MARGEN_G.right
const ALTO_PLOT_G = ALTO_G - MARGEN_G.top - MARGEN_G.bottom
const CANT_TICKS_Y_G = 6

const RANGOS_INFLACION = [
  { id: '1a', label: '1 año', anios: 1 },
  { id: '2a', label: '2 años', anios: 2 },
  { id: '4a', label: '4 años', anios: 4 },
]

// Mismo criterio de escalones "lindos" que ReservasCard.jsx -se duplica en vez de
// compartir un archivo de utils, mismo patrón que ya usa el resto del sitio-.
function pasoLindoG(rango, ticksObjetivo) {
  const pasoCrudo = rango / ticksObjetivo
  const magnitud = Math.pow(10, Math.floor(Math.log10(pasoCrudo)))
  const residual = pasoCrudo / magnitud
  if (residual > 5) return 10 * magnitud
  if (residual > 2) return 5 * magnitud
  if (residual > 1) return 2 * magnitud
  return magnitud
}
// Ver comentario en ReservasCard.jsx: margen del 10% arriba y abajo del rango real
// antes de calcular los escalones, para que la línea no quede pegada a los bordes
// en rangos angostos (ej. 1 año).
const MARGEN_DOMINIO_PCT_G = 0.1

function calcularTicksYG(minRaw, maxRaw) {
  const rango = maxRaw - minRaw || 1
  const margen = rango * MARGEN_DOMINIO_PCT_G
  const min = minRaw - margen
  const max = maxRaw + margen
  const paso = pasoLindoG(max - min, CANT_TICKS_Y_G)
  const inicio = Math.floor(min / paso) * paso
  const fin = Math.ceil(max / paso) * paso
  const ticks = []
  for (let v = inicio; v <= fin + paso * 0.001; v += paso) ticks.push(v)
  return ticks
}

// Ticks del eje X anclados al primer dato de cada mes calendario, salteando de a N
// meses según el rango -mismo criterio que ReservasCard.jsx-.
function calcularTicksXG(serie, pasoMeses) {
  const primera = new Date(serie[0].fecha)
  const ultima = serie[serie.length - 1].fecha
  const resultado = []
  let cursor = new Date(Date.UTC(primera.getUTCFullYear(), primera.getUTCMonth(), 1))
  while (true) {
    const cursorIso = cursor.toISOString().slice(0, 10)
    if (cursorIso > ultima) break
    const i = serie.findIndex((d) => d.fecha >= cursorIso)
    if (i !== -1) resultado.push(i)
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + pasoMeses, 1))
  }
  const ultimoIndice = serie.length - 1
  if (resultado[resultado.length - 1] !== ultimoIndice) resultado.push(ultimoIndice)
  return resultado
}

// Gráfico de tendencia de inflación interanual -mismo estilo que ReservasCard.jsx
// (SVG a mano, ejes con escalones lindos, sin librería de gráficos)-, pero recibe
// la serie ya calculada en memoria (no pide nada al BCRA: la serie mensual del IPC
// ya está cargada por el polling principal de esta pestaña).
function GraficoInteranual({ serieCompleta, rangoId }) {
  const [hoverIndex, setHoverIndex] = useState(null)
  const svgRef = useRef(null)
  useEffect(() => setHoverIndex(null), [rangoId])

  const serie = useMemo(() => {
    const anios = RANGOS_INFLACION.find((r) => r.id === rangoId).anios
    if (anios === Infinity) return serieCompleta
    const corte = new Date()
    corte.setUTCFullYear(corte.getUTCFullYear() - anios)
    const corteIso = corte.toISOString().slice(0, 10)
    return serieCompleta.filter((d) => d.fecha >= corteIso)
  }, [serieCompleta, rangoId])

  if (serie.length < 2) {
    return <p className="text-sm text-slate-500">No hay suficientes meses en este rango.</p>
  }

  const valores = serie.map((d) => d.valor)
  const minValor = Math.min(...valores)
  const maxValor = Math.max(...valores)
  const iMin = valores.indexOf(minValor)
  const iMax = valores.indexOf(maxValor)

  const ticksY = calcularTicksYG(minValor, maxValor)
  const dominioMin = ticksY[0]
  const dominioMax = ticksY[ticksY.length - 1]
  const dominioRango = dominioMax - dominioMin || 1

  const puntoXY = (d, i) => {
    const x = MARGEN_G.left + (i / (serie.length - 1)) * ANCHO_PLOT_G
    const y = MARGEN_G.top + ALTO_PLOT_G - ((d.valor - dominioMin) / dominioRango) * ALTO_PLOT_G
    return [x, y]
  }
  const puntos = serie.map((d, i) => puntoXY(d, i).map((n) => n.toFixed(1)).join(',')).join(' ')
  const [xMin, yMin] = puntoXY(serie[iMin], iMin)
  const [xMax, yMax] = puntoXY(serie[iMax], iMax)

  // Área sombreada bajo la línea -mismo criterio que ReservasCard.jsx-.
  const yPiso = MARGEN_G.top + ALTO_PLOT_G
  const [xPrimero] = puntoXY(serie[0], 0)
  const [xUltimo] = puntoXY(serie[serie.length - 1], serie.length - 1)
  const areaPath = `M${xPrimero},${yPiso} L${puntos.split(' ').join(' L')} L${xUltimo},${yPiso} Z`

  const pasoMeses = rangoId === '1a' ? 2 : rangoId === '2a' ? 3 : 6
  const ticksX = calcularTicksXG(serie, pasoMeses)

  // Ver comentario en ReservasCard.jsx: convierte una posición X de mouse/touch al
  // índice del dato más cercano, para que la línea de seguimiento enganche en
  // cualquier lugar del ancho del gráfico, no solo sobre un puntito chico.
  const indiceDesdeClientX = (clientX) => {
    const rect = svgRef.current.getBoundingClientRect()
    const xViewBox = ((clientX - rect.left) / rect.width) * ANCHO_G
    const proporcion = (xViewBox - MARGEN_G.left) / ANCHO_PLOT_G
    const indice = Math.round(proporcion * (serie.length - 1))
    return Math.min(Math.max(indice, 0), serie.length - 1)
  }
  const onPointerMove = (e) => setHoverIndex(indiceDesdeClientX(e.clientX))
  const onTouchMove = (e) => {
    e.preventDefault()
    setHoverIndex(indiceDesdeClientX(e.touches[0].clientX))
  }

  return (
    <div>
      <svg ref={svgRef} viewBox={`0 0 ${ANCHO_G} ${ALTO_G}`} className="h-64 w-full sm:h-72" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gradienteInflacion" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticksY.map((v) => {
          const y = MARGEN_G.top + ALTO_PLOT_G - ((v - dominioMin) / dominioRango) * ALTO_PLOT_G
          return (
            <g key={v}>
              <line x1={MARGEN_G.left} x2={ANCHO_G - MARGEN_G.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={MARGEN_G.left - 8} y={y} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[10px]">
                {v.toFixed(1)}%
              </text>
            </g>
          )
        })}

        {/* Oculta en mobile: ahí la unidad se aclara en el subtítulo del modal para
            no comerse espacio del gráfico en pantallas angostas. */}
        <text
          x={14}
          y={MARGEN_G.top + ALTO_PLOT_G / 2}
          textAnchor="middle"
          transform={`rotate(-90, 14, ${MARGEN_G.top + ALTO_PLOT_G / 2})`}
          className="hidden fill-slate-500 text-[10px] font-semibold uppercase tracking-wide sm:block"
        >
          Inflación mensual
        </text>

        {ticksX.map((i) => {
          const [x] = puntoXY(serie[i], i)
          return (
            <text key={i} x={x} y={ALTO_G - MARGEN_G.bottom + 18} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {formatMesAnio(serie[i].fecha)}
            </text>
          )
        })}

        <path d={areaPath} fill="url(#gradienteInflacion)" />
        <polyline points={puntos} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        <circle cx={xMin} cy={yMin} r="4" fill="#059669" />
        <circle cx={xMax} cy={yMax} r="4" fill="#e11d48" />

        {/* Línea de seguimiento ("crosshair"): sigue el dedo/mouse y engancha al
            dato más cercano, en vez de depender de acertarle a un puntito chico. */}
        {hoverIndex !== null && serie[hoverIndex] && (
          (() => {
            const d = serie[hoverIndex]
            const [x, y] = puntoXY(d, hoverIndex)
            const anchoCaja = 84
            const xCaja = Math.min(Math.max(x - anchoCaja / 2, MARGEN_G.left), ANCHO_G - MARGEN_G.right - anchoCaja)
            const arribaOk = y - 34 > MARGEN_G.top
            const yCaja = arribaOk ? y - 34 : y + 12
            return (
              <g pointerEvents="none">
                <line x1={x} x2={x} y1={MARGEN_G.top} y2={ALTO_G - MARGEN_G.bottom} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
                <circle cx={x} cy={y} r="5" fill="#7c3aed" stroke="white" strokeWidth="2" />
                <rect x={xCaja} y={yCaja} width={anchoCaja} height={26} rx="5" fill="#1e293b" />
                <text x={xCaja + anchoCaja / 2} y={yCaja + 10} textAnchor="middle" className="fill-white text-[9px] font-semibold">
                  {formatMesAnio(d.fecha)}
                </text>
                <text x={xCaja + anchoCaja / 2} y={yCaja + 20} textAnchor="middle" className="fill-white text-[10px] font-bold">
                  {d.valor.toFixed(1)}%
                </text>
              </g>
            )
          })()
        )}

        {/* Franja invisible sobre todo el área del gráfico: mover el mouse o
            arrastrar el dedo en cualquier lado engancha al dato más cercano. */}
        <rect
          x={MARGEN_G.left}
          y={MARGEN_G.top}
          width={ANCHO_PLOT_G}
          height={ALTO_PLOT_G}
          fill="transparent"
          style={{ touchAction: 'none' }}
          onMouseMove={onPointerMove}
          onMouseLeave={() => setHoverIndex(null)}
          onTouchStart={onTouchMove}
          onTouchMove={onTouchMove}
          onTouchEnd={() => setHoverIndex(null)}
        />
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          Mínimo: <strong className="text-slate-900">{minValor.toFixed(1)}%</strong>
          <span className="text-slate-400">({formatFechaCorta(serie[iMin].fecha)})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-600" />
          Máximo: <strong className="text-slate-900">{maxValor.toFixed(1)}%</strong>
          <span className="text-slate-400">({formatFechaCorta(serie[iMax].fecha)})</span>
        </span>
      </div>
    </div>
  )
}

function ModalInteranual({ onClose, serieCompleta }) {
  const [rangoId, setRangoId] = useState('2a')

  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Portal a document.body: ver comentario en ReservasCard.jsx -mismo bug de
  // position:fixed atrapado por el transform de la tarjeta, mismo arreglo-.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">Inflación mensual histórica</p>
            <p className="text-xs text-slate-500">
              Variación mensual del IPC (INDEC) <span className="sm:hidden">(% mensual)</span>
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

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-xs sm:inline-flex sm:gap-0">
          {RANGOS_INFLACION.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRangoId(r.id)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                rangoId === r.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <GraficoInteranual serieCompleta={serieCompleta} rangoId={rangoId} />
        </div>
      </div>
    </div>,
    document.body
  )
}

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)

const formatMes = (yearMonth) => {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

const formatFecha = (fechaIso) => {
  const d = new Date(fechaIso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

function mesActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function eneroAnioActual() {
  return `${new Date().getFullYear()}-01`
}

export default function InflacionTab() {
  const fetcher = useCallback(() => fetchInflacionMensual(), [])
  const { data, error, loading, updatedAt, refresh } = usePolling(fetcher, {
    intervalMs: 30 * 60 * 1000,
    persistKey: 'inflacion',
  })

  const [monto, setMonto] = useState('100000')
  const montoNumerico = monto === '' ? 0 : Number(monto)
  const [desde, setDesde] = useState(eneroAnioActual())
  const [hasta, setHasta] = useState(mesActual())

  const minMes = data?.[0]?.fecha.slice(0, 7)
  const maxMes = mesActual()

  const rangoValido = data && desde && hasta && desde <= hasta

  const resultado = useMemo(() => {
    if (!rangoValido) return null
    const factor = factorAcumulado(data, desde, hasta)
    return {
      valorHoy: valorActualizado(data, montoNumerico, desde, hasta),
      inflacionAcumuladaPct: (factor - 1) * 100,
    }
  }, [data, montoNumerico, desde, hasta, rangoValido])

  const detalleMensual = useMemo(() => {
    if (!rangoValido) return []
    return mesesEnRango(data, desde, hasta).slice().reverse()
  }, [data, desde, hasta, rangoValido])

  const interanual = useMemo(() => (data ? inflacionInteranual(data) : null), [data])

  // `data` ya es la serie mensual del IPC -no hace falta pedir nada nuevo al BCRA
  // ni calcular nada: es el mismo dato que ya carga el polling principal de esta
  // pestaña, se lo pasa directo al gráfico-.
  const [modalInteranualAbierto, setModalInteranualAbierto] = useState(false)

  // Acumulada de enero a hoy, para mostrar al lado de la interanual -mismo motor que
  // usa la calculadora de abajo, pero con un rango fijo (no el que el usuario elija ahí).
  const acumuladaAnioActual = useMemo(() => {
    if (!data) return null
    const factor = factorAcumulado(data, eneroAnioActual(), mesActual())
    return (factor - 1) * 100
  }, [data])

  // Ver comentario en ReservasCard.jsx: el intervalo corto es para autocorregir un
  // fallo transitorio, no por necesidad de frescura (ninguno de los dos cambia
  // seguido: el REM es mensual, el plazo fijo lo publica el BCRA 1 vez/día).
  const { data: rem } = usePolling(fetchExpectativaInflacionREM, {
    intervalMs: 5 * 60 * 1000,
    persistKey: 'expectativa_inflacion_rem',
  })

  const { data: plazoFijo } = usePolling(fetchTasaPlazoFijo30Dias, {
    intervalMs: 5 * 60 * 1000,
    persistKey: 'plazo_fijo_30d',
  })

  // Si ya se cargó bien una vez, un error transitorio en una actualización en
  // segundo plano no debe hacer desaparecer el contenido.
  if (!data && loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  if (!data && error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-rose-600">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Reintentar
        </button>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Badge variant="positive">Fuente: BCRA</Badge>
        <div className="flex items-center gap-3 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 shadow-sm backdrop-blur-sm">
          {updatedAt && <span>Actualizado {updatedAt.toLocaleTimeString('es-AR')}</span>}
          <button type="button" onClick={refresh} className="font-semibold text-brand-300 hover:text-white hover:underline">
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          {interanual !== null ? (
            <Card className="group h-full border-t-4 !border-t-brand-300 p-6 hover:!border-t-brand-500 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M15 7h6v6" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-900">Inflación Interanual</p>
                {data && data.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => setModalInteranualAbierto(true)}
                    aria-label="Ver tendencia histórica de la inflación mensual"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors hover:bg-brand-600 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 3 6-7M18 8h3v3" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Últimos 12 meses</p>
                  <p className="mt-0.5 text-3xl font-bold text-slate-900">{interanual.toFixed(2)}%</p>
                </div>
                {acumuladaAnioActual !== null && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Acumulada {new Date().getFullYear()}
                    </p>
                    <p className="mt-0.5 text-3xl font-bold text-slate-900">{acumuladaAnioActual.toFixed(2)}%</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Variación acumulada del Índice de Precios al Consumidor (IPC Nacional) publicada por
                INDEC.
              </p>
            </Card>
          ) : (
            <div className="h-[122px] animate-pulse rounded-2xl bg-slate-100 sm:h-[223px]" />
          )}
        </div>

        <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
          {rem ? (
            <Card className="group h-full border-t-4 !border-t-[#d4a465] p-6 hover:!border-t-[#c17a1e] transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fbeed6] text-[#c17a1e] transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-[#c17a1e] group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-2 6-6 2 2-6 6-2z" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-900">Inflación Esperada (REM · BCRA)</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Próximos 12 meses</p>
                  <p className="mt-0.5 text-3xl font-bold text-slate-900">{rem.proximos12MesesPct.toFixed(2)}%</p>
                </div>
                {rem.anioActual && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {rem.anioActual.anio} completo
                    </p>
                    <p className="mt-0.5 text-3xl font-bold text-slate-900">{rem.anioActual.pct.toFixed(2)}%</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Mediana proyectada según el Relevamiento de Expectativas de Mercado.
              </p>
            </Card>
          ) : (
            <div className="h-[193px] animate-pulse rounded-2xl bg-slate-100 sm:h-[223px]" />
          )}
        </div>

        <div className="animate-fade-up" style={{ animationDelay: '160ms' }}>
          {plazoFijo ? (
            <Card className="group h-full border-t-4 !border-t-[#7fa88a] p-6 hover:!border-t-emerald-500 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 3M12 3a9 9 0 100 18 9 9 0 000-18z" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-900">Plazo Fijo a 30 Días (BCRA)</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">TNA</p>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-slate-900">{plazoFijo.valor.toFixed(2)}%</p>
                    <DayChangeBadge current={plazoFijo.valor} previous={plazoFijo.valorAnterior} />
                  </div>
                </div>
                {plazoFijo.tea !== null && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">TEA</p>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-slate-900">{plazoFijo.tea.toFixed(2)}%</p>
                      <DayChangeBadge current={plazoFijo.tea} previous={plazoFijo.teaAnterior} />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Tasa pasiva de referencia del sistema financiero para colocaciones a 30 días en
                  plazos fijos.
                </p>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                  Al cierre: {formatFecha(plazoFijo.fecha)}
                </span>
              </div>
            </Card>
          ) : (
            <div className="h-[235px] animate-pulse rounded-2xl bg-slate-100 sm:h-[223px]" />
          )}
        </div>
      </div>

      <div className="mt-4">
        <Card className="animate-fade-up !bg-slate-50 p-6" style={{ animationDelay: '240ms' }}>
          <h3 className="font-semibold text-slate-900">Evolución del Poder Adquisitivo</h3>
          <p className="mt-1 text-sm text-slate-500">
            Seleccione un período para evaluar el impacto inflacionario acumulado y el valor
            actualizado en términos reales del capital.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Monto inicial</label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-slate-500">$</span>
                <input
                  type="number"
                  min="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Período inicial</label>
              <MonthPicker value={desde} onChange={setDesde} min={minMes} max={maxMes} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Período final</label>
              <MonthPicker value={hasta} onChange={setHasta} min={minMes} max={maxMes} />
            </div>
          </div>

          {!rangoValido && (
            <p className="mt-4 text-sm text-rose-600">La fecha "Desde" tiene que ser anterior a "Hasta".</p>
          )}

          {resultado && (
            <>
              <p className="mt-6 text-sm text-slate-600">
                Inflación acumulada de <strong>{formatMes(desde)}</strong> a{' '}
                <strong>{formatMes(hasta)}</strong>:
              </p>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0 rounded-xl bg-brand-700 p-4">
                  <p className="text-xs text-white/70">Capital equivalente actualizado</p>
                  <p className="break-words text-xl font-bold text-white sm:text-2xl">
                    {formatArs(resultado.valorHoy)}
                  </p>
                </div>
                <div className="min-w-0 rounded-xl bg-orange-400 p-4">
                  <p className="text-xs text-slate-900/70">Inflación acumulada</p>
                  <p className="break-words text-xl font-bold text-slate-900 sm:text-2xl">
                    +{resultado.inflacionAcumuladaPct.toFixed(2)}%
                  </p>
                </div>
              </div>

              {detalleMensual.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mes a mes</p>
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-slate-100">
                        {detalleMensual.map((d) => (
                          <tr key={d.fecha} className="transition-colors hover:bg-brand-50/60">
                            <td className="px-4 py-2 capitalize text-slate-600">{formatMes(d.fecha.slice(0, 7))}</td>
                            <td
                              className={`px-4 py-2 text-right font-semibold ${
                                d.valor < 0 ? 'text-emerald-600' : 'text-slate-900'
                              }`}
                            >
                              {d.valor > 0 ? '+' : ''}
                              {d.valor.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-black/30 px-4 py-3 ring-1 ring-inset ring-white/10">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-300"
          >
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8h.01M11 12h1v4h1" />
          </svg>
          <p className="text-xs text-slate-200">
            Cálculo estimado en base al Índice de Precios al Consumidor (IPC - INDEC). Herramienta
            analítica con fines históricos y didácticos para medir la variación del poder
            adquisitivo. No constituye una proyección a futuro ni recomendación operativa.
          </p>
        </div>
      </div>

      {modalInteranualAbierto && (
        <ModalInteranual onClose={() => setModalInteranualAbierto(false)} serieCompleta={data} />
      )}
    </div>
  )
}
