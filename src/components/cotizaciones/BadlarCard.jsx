import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Card from '../ui/Card'
import DayChangeBadge from '../ui/DayChangeBadge'
import { fetchBadlar, fetchBadlarSerie, fetchInflacionMensual } from '../../services/bcraApi'
import { usePolling } from '../../hooks/usePolling'
import { fetchConReintento } from '../../utils/fetchRetry'

const formatFecha = (fechaIso) => {
  const d = new Date(fechaIso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const formatMesAnio = (mesIso) => {
  const [anio, mes] = mesIso.split('-')
  return `${MESES_CORTOS[Number(mes) - 1]}-${anio.slice(2)}`
}

// Ver comentario en TamarCard.jsx (calcularSerieMensual): capitalización diaria
// exacta -TED = TNA/365 cada día calendario, no solo los hábiles-, con forward-fill
// para cubrir fines de semana/feriados sin publicación. Misma fórmula, aplicada acá
// a BADLAR en vez de TAMAR.
function calcularSerieMensual(badlarSerie, ipcSerie) {
  if (badlarSerie.length === 0) return []

  const porDia = new Map(badlarSerie.map((d) => [d.fecha, d.valor]))
  const primerDia = new Date(`${badlarSerie[0].fecha}T00:00:00Z`)
  const ultimoDia = new Date(`${badlarSerie[badlarSerie.length - 1].fecha}T00:00:00Z`)

  const porMes = new Map()
  let ultimoValorConocido = null
  for (let d = new Date(primerDia); d <= ultimoDia; d.setUTCDate(d.getUTCDate() + 1)) {
    const fechaIso = d.toISOString().slice(0, 10)
    if (porDia.has(fechaIso)) ultimoValorConocido = porDia.get(fechaIso)
    if (ultimoValorConocido === null) continue // todavía no hay ningún dato previo para rellenar
    const mes = fechaIso.slice(0, 7)
    if (!porMes.has(mes)) porMes.set(mes, [])
    porMes.get(mes).push(ultimoValorConocido)
  }

  const ipcPorMes = new Map(ipcSerie.map((d) => [d.fecha.slice(0, 7), d.valor]))

  const resultado = []
  for (const [mes, valoresDiarios] of porMes) {
    if (!ipcPorMes.has(mes)) continue // mes en curso: el IPC todavía no se publicó
    if (valoresDiarios.length < 25) continue // mes incompleto (primer/último mes de la serie): no alcanza a cubrir el mes entero
    const factor = valoresDiarios.reduce((acc, tna) => acc * (1 + tna / 100 / 365), 1)
    const badlarTem = (factor - 1) * 100
    resultado.push({ mes, badlar: badlarTem, ipc: ipcPorMes.get(mes) })
  }
  return resultado.sort((a, b) => a.mes.localeCompare(b.mes))
}

const ANCHO = 640
const ALTO = 300
const MARGEN = { top: 12, right: 16, bottom: 44, left: 56 }
const ANCHO_PLOT = ANCHO - MARGEN.left - MARGEN.right
const ALTO_PLOT = ALTO - MARGEN.top - MARGEN.bottom
const CANT_TICKS_Y_OBJETIVO = 6
const MARGEN_DOMINIO_PCT = 0.1
const COLOR_BADLAR = '#5b21b6'
const COLOR_IPC = '#f59e0b'
// El violeta oscuro de la línea (COLOR_BADLAR) se pierde sobre el fondo también
// oscuro del tooltip -bajo contraste, poco legible-. Variante clara, solo para el
// texto dentro de esa caja.
const COLOR_BADLAR_TOOLTIP = '#c4b5fd'

// Ver comentario en TamarCard.jsx: sombra muy sutil debajo de cada línea, más
// discreta que el degradé de área que tienen Reservas/Inflación.
const sombra = (color) => `drop-shadow(0 2px 1.5px ${color}30)`

const RANGOS = [
  { id: '6m', label: '6 meses', dias: 182 },
  { id: '12m', label: '1 año', dias: 365 },
  { id: 'todo', label: 'Todo', dias: Infinity },
]

// Mismo criterio de escalones "lindos" que ReservasCard.jsx -se duplica en vez de
// compartir un archivo de utils, mismo patrón que ya usa el resto del sitio-.
function pasoLindo(rango, ticksObjetivo) {
  const pasoCrudo = rango / ticksObjetivo
  const magnitud = Math.pow(10, Math.floor(Math.log10(pasoCrudo)))
  const residual = pasoCrudo / magnitud
  if (residual > 5) return 10 * magnitud
  if (residual > 2) return 5 * magnitud
  if (residual > 1) return 2 * magnitud
  return magnitud
}
// Ver comentario en TamarCard.jsx: el piso del eje se ancla en 0% -para que la
// brecha visual entre BADLAR e IPC sea proporcional a la diferencia real, no
// exagerada por recortar el piso del gráfico-.
function calcularTicksY(minRaw, maxRaw) {
  const rango = maxRaw - minRaw || 1
  const max = maxRaw + rango * MARGEN_DOMINIO_PCT
  const min = Math.min(0, minRaw)
  const paso = pasoLindo(max - min, CANT_TICKS_Y_OBJETIVO)
  const inicio = Math.floor(min / paso) * paso
  const fin = Math.ceil(max / paso) * paso
  const ticks = []
  for (let v = inicio; v <= fin + paso * 0.001; v += paso) ticks.push(v)
  return ticks
}

// Ticks del eje X anclados al primer dato de cada mes calendario -mismo criterio que
// ReservasCard.jsx/InflacionTab.jsx-.
function calcularTicksX(serie, pasoMeses) {
  const primera = new Date(`${serie[0].mes}-01`)
  const ultima = `${serie[serie.length - 1].mes}-01`
  const resultado = []
  let cursor = new Date(Date.UTC(primera.getUTCFullYear(), primera.getUTCMonth(), 1))
  while (true) {
    const cursorMes = cursor.toISOString().slice(0, 7)
    if (`${cursorMes}-01` > ultima) break
    const i = serie.findIndex((d) => d.mes >= cursorMes)
    if (i !== -1) resultado.push(i)
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + pasoMeses, 1))
  }
  const ultimoIndice = serie.length - 1
  if (resultado[resultado.length - 1] !== ultimoIndice) resultado.push(ultimoIndice)
  return resultado
}

// Gráfico de dos líneas -BADLAR (capitalización diaria exacta) e IPC mensual, cada
// una un dato correcto por sí solo, sin combinarlas en un único número-. Mismo
// estilo que TamarCard.jsx: SVG a mano, ejes con escalones lindos, línea de
// seguimiento que engancha al mes más cercano, sin relleno de área -con dos series
// superpuestas, el degradé ensuciaba la lectura, mejor líneas sólidas-.
function GraficoComparativo({ serieCompleta, rangoId }) {
  const [hoverIndex, setHoverIndex] = useState(null)
  const svgRef = useRef(null)
  useEffect(() => setHoverIndex(null), [rangoId])

  const serie = useMemo(() => {
    const dias = RANGOS.find((r) => r.id === rangoId).dias
    if (dias === Infinity) return serieCompleta
    const corte = new Date()
    corte.setUTCDate(corte.getUTCDate() - dias)
    const corteMes = corte.toISOString().slice(0, 7)
    return serieCompleta.filter((d) => d.mes >= corteMes)
  }, [serieCompleta, rangoId])

  if (serie.length < 2) {
    return <p className="text-sm text-slate-500">No hay suficientes meses con BADLAR e IPC publicados en este rango.</p>
  }

  const valores = serie.flatMap((d) => [d.badlar, d.ipc])
  const ticksY = calcularTicksY(Math.min(...valores), Math.max(...valores))
  const dominioMin = ticksY[0]
  const dominioMax = ticksY[ticksY.length - 1]
  const dominioRango = dominioMax - dominioMin || 1

  const puntoXY = (valor, i) => {
    const x = MARGEN.left + (i / (serie.length - 1)) * ANCHO_PLOT
    const y = MARGEN.top + ALTO_PLOT - ((valor - dominioMin) / dominioRango) * ALTO_PLOT
    return [x, y]
  }
  const puntosBadlar = serie.map((d, i) => puntoXY(d.badlar, i).map((n) => n.toFixed(1)).join(',')).join(' ')
  const puntosIpc = serie.map((d, i) => puntoXY(d.ipc, i).map((n) => n.toFixed(1)).join(',')).join(' ')

  const pasoMeses = rangoId === '6m' ? 1 : rangoId === '12m' ? 2 : 6
  const ticksX = calcularTicksX(serie, pasoMeses)

  const indiceDesdeClientX = (clientX) => {
    const rect = svgRef.current.getBoundingClientRect()
    const xViewBox = ((clientX - rect.left) / rect.width) * ANCHO
    const proporcion = (xViewBox - MARGEN.left) / ANCHO_PLOT
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
      <div className="mb-2 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: COLOR_BADLAR }} />
          BADLAR (capitalización diaria)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: COLOR_IPC }} />
          IPC mensual
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-64 w-full sm:h-72"
        preserveAspectRatio="none"
      >
        {ticksY.map((v) => {
          const y = MARGEN.top + ALTO_PLOT - ((v - dominioMin) / dominioRango) * ALTO_PLOT
          return (
            <g key={v}>
              <line x1={MARGEN.left} x2={ANCHO - MARGEN.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={MARGEN.left - 8} y={y} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[10px]">
                {v.toFixed(1)}%
              </text>
            </g>
          )
        })}

        <text
          x={14}
          y={MARGEN.top + ALTO_PLOT / 2}
          textAnchor="middle"
          transform={`rotate(-90, 14, ${MARGEN.top + ALTO_PLOT / 2})`}
          className="hidden fill-slate-500 text-[10px] font-semibold uppercase tracking-wide sm:block"
        >
          Tasa mensual
        </text>

        {ticksX.map((i) => {
          const [x] = puntoXY(serie[i].badlar, i)
          return (
            <text key={i} x={x} y={ALTO - MARGEN.bottom + 18} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {formatMesAnio(serie[i].mes)}
            </text>
          )
        })}

        <polyline
          points={puntosIpc}
          fill="none"
          stroke={COLOR_IPC}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: sombra(COLOR_IPC) }}
        />
        <polyline
          points={puntosBadlar}
          fill="none"
          stroke={COLOR_BADLAR}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: sombra(COLOR_BADLAR) }}
        />

        {hoverIndex !== null && serie[hoverIndex] && (
          (() => {
            const d = serie[hoverIndex]
            const [xBadlar, yBadlar] = puntoXY(d.badlar, hoverIndex)
            const [, yIpc] = puntoXY(d.ipc, hoverIndex)
            const anchoCaja = 108
            const xCaja = Math.min(Math.max(xBadlar - anchoCaja / 2, MARGEN.left), ANCHO - MARGEN.right - anchoCaja)
            const yTope = Math.min(yBadlar, yIpc)
            const arribaOk = yTope - 46 > MARGEN.top
            const yCaja = arribaOk ? yTope - 46 : Math.max(yBadlar, yIpc) + 12
            return (
              <g pointerEvents="none">
                <line x1={xBadlar} x2={xBadlar} y1={MARGEN.top} y2={ALTO - MARGEN.bottom} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
                <circle cx={xBadlar} cy={yIpc} r="5" fill={COLOR_IPC} stroke="white" strokeWidth="2" />
                <circle cx={xBadlar} cy={yBadlar} r="5" fill={COLOR_BADLAR} stroke="white" strokeWidth="2" />
                <rect x={xCaja} y={yCaja} width={anchoCaja} height={38} rx="5" fill="#1e293b" />
                <text x={xCaja + anchoCaja / 2} y={yCaja + 11} textAnchor="middle" className="fill-white text-[9px] font-semibold">
                  {formatMesAnio(d.mes)}
                </text>
                <text x={xCaja + anchoCaja / 2} y={yCaja + 23} textAnchor="middle" className="text-[10px] font-bold" fill={COLOR_BADLAR_TOOLTIP}>
                  BADLAR {d.badlar.toFixed(2)}%
                </text>
                <text x={xCaja + anchoCaja / 2} y={yCaja + 34} textAnchor="middle" className="text-[10px] font-bold" fill={COLOR_IPC}>
                  IPC {d.ipc.toFixed(2)}%
                </text>
              </g>
            )
          })()
        )}

        <rect
          x={MARGEN.left}
          y={MARGEN.top}
          width={ANCHO_PLOT}
          height={ALTO_PLOT}
          fill="transparent"
          style={{ touchAction: 'none' }}
          onMouseMove={onPointerMove}
          onMouseLeave={() => setHoverIndex(null)}
          onTouchStart={onTouchMove}
          onTouchMove={onTouchMove}
          onTouchEnd={() => setHoverIndex(null)}
        />
      </svg>
      <p className="mt-2 text-[10px] text-slate-400">
        BADLAR: Tasa efectiva mensual (capitalización diaria de la TNA/365). Series independientes y no acumulativas.
      </p>
    </div>
  )
}

function ModalTendencia({ onClose, badlarSerie, ipcSerie, cargando, onReintentar }) {
  const [rangoId, setRangoId] = useState('12m')
  const serieCompleta = useMemo(
    () => (badlarSerie && ipcSerie ? calcularSerieMensual(badlarSerie, ipcSerie) : null),
    [badlarSerie, ipcSerie]
  )

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
            <p className="font-semibold text-slate-900">BADLAR vs. IPC mensual</p>
            <p className="text-xs text-slate-500">
              Comparativa entre el rendimiento efectivo mensual contra la inflación <span className="sm:hidden">(tasa mensual, %)</span>
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
          {RANGOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRangoId(r.id)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                rangoId === r.id ? 'bg-white text-violet-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {cargando && <div className="h-64 animate-pulse rounded bg-slate-100 sm:h-72" />}
          {!cargando && serieCompleta && <GraficoComparativo serieCompleta={serieCompleta} rangoId={rangoId} />}
          {!cargando && !serieCompleta && (
            <div className="text-center">
              <p className="text-sm text-rose-500">No se pudo cargar la comparación. Puede ser un problema pasajero del BCRA.</p>
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

export default function BadlarCard() {
  // Ver comentario en ReservasCard.jsx: el intervalo corto es para autocorregir
  // un fallo transitorio, no por necesidad de frescura (el BCRA publica 1 vez/día).
  const { data: badlar } = usePolling(fetchBadlar, {
    intervalMs: 5 * 60 * 1000,
    persistKey: 'badlar_bcra',
  })

  const [modalAbierto, setModalAbierto] = useState(false)
  const [badlarSerie, setBadlarSerie] = useState(null)
  const [ipcSerie, setIpcSerie] = useState(null)
  const [cargando, setCargando] = useState(false)

  // Se piden los dos historiales (BADLAR e IPC) una sola vez, en paralelo, recién al
  // tocar el ícono -no en la carga inicial de la página-.
  const cargarDatos = () => {
    setCargando(true)
    Promise.all([fetchConReintento(() => fetchBadlarSerie(730)), fetchConReintento(fetchInflacionMensual)])
      .then(([badlarData, ipcData]) => {
        setBadlarSerie(badlarData)
        setIpcSerie(ipcData)
      })
      .catch(() => {
        setBadlarSerie(null)
        setIpcSerie(null)
      })
      .finally(() => setCargando(false))
  }

  const abrirTendencia = () => {
    setModalAbierto(true)
    if (!badlarSerie || !ipcSerie) cargarDatos()
  }

  if (!badlar) return null

  return (
    <Card
      className="group animate-fade-up border-t-4 !border-t-violet-300 p-6 hover:!border-t-violet-800 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)]"
      style={{ animationDelay: '160ms' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-violet-800 group-hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <circle cx="7" cy="7" r="3" />
              <circle cx="17" cy="17" r="3" />
              <path strokeLinecap="round" d="M17 7L7 17" />
            </svg>
          </div>
          <p className="font-semibold text-slate-900">BADLAR (BCRA)</p>
          <button
            type="button"
            onClick={abrirTendencia}
            aria-label="Ver BADLAR contra el IPC mensual"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-800 transition-colors hover:bg-violet-800 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 3 6-7M18 8h3v3" />
            </svg>
          </button>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Al cierre: {formatFecha(badlar.fecha)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">TNA</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900">{badlar.valor.toFixed(2)}%</p>
            <DayChangeBadge current={badlar.valor} previous={badlar.valorAnterior} />
          </div>
        </div>
        {badlar.tea !== null && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">TEA</p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-slate-900">{badlar.tea.toFixed(2)}%</p>
              <DayChangeBadge current={badlar.tea} previous={badlar.teaAnterior} />
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Tasa promedio para depósitos a plazo fijo mayoristas en bancos privados (estrato superior a
        $1M, plazo 30-35 días).
      </p>

      {modalAbierto && (
        <ModalTendencia
          onClose={() => setModalAbierto(false)}
          badlarSerie={badlarSerie}
          ipcSerie={ipcSerie}
          cargando={cargando}
          onReintentar={cargarDatos}
        />
      )}
    </Card>
  )
}
