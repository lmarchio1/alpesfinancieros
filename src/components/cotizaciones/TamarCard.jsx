import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Card from '../ui/Card'
import DayChangeBadge from '../ui/DayChangeBadge'
import { fetchTamar, fetchTamarSerie, fetchInflacionMensual } from '../../services/bcraApi'
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

// Capitalización diaria exacta: convierte cada TNA diaria en tasa efectiva diaria
// (TED = TNA/365) y compone el producto de (1+TED) a lo largo de TODOS los días
// calendario del mes -no solo los hábiles-. El BCRA no publica TAMAR los fines de
// semana ni feriados (en febrero 2026, por ejemplo, publicó 18 de 28 días), pero un
// depósito sigue devengando interés esos días igual, al último TNA vigente -por eso
// se "rellena hacia adelante" (forward-fill) el valor del último día hábil publicado
// para cubrir los días sin dato, en vez de saltearlos-. Sin este relleno, el cálculo
// subestima el resultado real (probado en vivo: para febrero daba 1,64% salteando
// fines de semana, contra un valor mayor y correcto rellenando los 28 días).
function calcularSerieMensual(tamarSerie, ipcSerie) {
  if (tamarSerie.length === 0) return []

  const porDia = new Map(tamarSerie.map((d) => [d.fecha, d.valor]))
  const primerDia = new Date(`${tamarSerie[0].fecha}T00:00:00Z`)
  const ultimoDia = new Date(`${tamarSerie[tamarSerie.length - 1].fecha}T00:00:00Z`)

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
    const tamarTem = (factor - 1) * 100
    resultado.push({ mes, tamar: tamarTem, ipc: ipcPorMes.get(mes) })
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
const COLOR_TAMAR = '#7c3aed'
const COLOR_IPC = '#f59e0b'
// Ver comentario en BadlarCard.jsx: variante clara del violeta, solo para el texto
// dentro del tooltip oscuro -mejor contraste que el color de la línea-.
const COLOR_TAMAR_TOOLTIP = '#a78bfa'

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
// El piso del eje se ancla en 0% -no con el mismo margen del 10% que se aplica
// arriba- porque acá lo que importa es comparar la brecha entre dos líneas (TAMAR
// vs. IPC), y recortar el piso exagera esa brecha visualmente. Si algún mes diera
// negativo, se respeta ese mínimo real en vez de forzar 0 -para no cortar el dato-.
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

// Gráfico de dos líneas -TAMAR (capitalización diaria exacta) e IPC mensual, cada
// una un dato correcto por sí solo, sin combinarlas en un número único-. Mismo
// estilo que ReservasCard.jsx/InflacionTab.jsx: SVG a mano, ejes con escalones
// lindos, línea de seguimiento que engancha al mes más cercano.
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
    return <p className="text-sm text-slate-500">No hay suficientes meses con TAMAR e IPC publicados en este rango.</p>
  }

  const valores = serie.flatMap((d) => [d.tamar, d.ipc])
  const ticksY = calcularTicksY(Math.min(...valores), Math.max(...valores))
  const dominioMin = ticksY[0]
  const dominioMax = ticksY[ticksY.length - 1]
  const dominioRango = dominioMax - dominioMin || 1

  const puntoXY = (valor, i) => {
    const x = MARGEN.left + (i / (serie.length - 1)) * ANCHO_PLOT
    const y = MARGEN.top + ALTO_PLOT - ((valor - dominioMin) / dominioRango) * ALTO_PLOT
    return [x, y]
  }
  const puntosTamar = serie.map((d, i) => puntoXY(d.tamar, i).map((n) => n.toFixed(1)).join(',')).join(' ')
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
          <span className="h-2 w-2 rounded-full" style={{ background: COLOR_TAMAR }} />
          TAMAR (capitalización diaria)
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
          const [x] = puntoXY(serie[i].tamar, i)
          return (
            <text key={i} x={x} y={ALTO - MARGEN.bottom + 18} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {formatMesAnio(serie[i].mes)}
            </text>
          )
        })}

        <polyline points={puntosIpc} fill="none" stroke={COLOR_IPC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={puntosTamar} fill="none" stroke={COLOR_TAMAR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {hoverIndex !== null && serie[hoverIndex] && (
          (() => {
            const d = serie[hoverIndex]
            const [xTamar, yTamar] = puntoXY(d.tamar, hoverIndex)
            const [, yIpc] = puntoXY(d.ipc, hoverIndex)
            const anchoCaja = 108
            const xCaja = Math.min(Math.max(xTamar - anchoCaja / 2, MARGEN.left), ANCHO - MARGEN.right - anchoCaja)
            const yTope = Math.min(yTamar, yIpc)
            const arribaOk = yTope - 46 > MARGEN.top
            const yCaja = arribaOk ? yTope - 46 : Math.max(yTamar, yIpc) + 12
            return (
              <g pointerEvents="none">
                <line x1={xTamar} x2={xTamar} y1={MARGEN.top} y2={ALTO - MARGEN.bottom} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
                <circle cx={xTamar} cy={yIpc} r="5" fill={COLOR_IPC} stroke="white" strokeWidth="2" />
                <circle cx={xTamar} cy={yTamar} r="5" fill={COLOR_TAMAR} stroke="white" strokeWidth="2" />
                <rect x={xCaja} y={yCaja} width={anchoCaja} height={38} rx="5" fill="#1e293b" />
                <text x={xCaja + anchoCaja / 2} y={yCaja + 11} textAnchor="middle" className="fill-white text-[9px] font-semibold">
                  {formatMesAnio(d.mes)}
                </text>
                <text x={xCaja + anchoCaja / 2} y={yCaja + 23} textAnchor="middle" className="text-[10px] font-bold" fill={COLOR_TAMAR_TOOLTIP}>
                  TAMAR {d.tamar.toFixed(2)}%
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
        TAMAR: Tasa efectiva mensual (capitalización diaria de la TNA/365). Series independientes y no acumulativas.
      </p>
    </div>
  )
}

function ModalTendencia({ onClose, tamarSerie, ipcSerie, cargando, onReintentar }) {
  const [rangoId, setRangoId] = useState('12m')
  const serieCompleta = useMemo(
    () => (tamarSerie && ipcSerie ? calcularSerieMensual(tamarSerie, ipcSerie) : null),
    [tamarSerie, ipcSerie]
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
            <p className="font-semibold text-slate-900">TAMAR vs. IPC mensual</p>
            <p className="text-xs text-slate-500">
              Dos series independientes, sin combinar <span className="sm:hidden">(tasa mensual, %)</span>
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
                rangoId === r.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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

export default function TamarCard() {
  // Ver comentario en ReservasCard.jsx: el intervalo corto es para autocorregir
  // un fallo transitorio, no por necesidad de frescura (el BCRA publica 1 vez/día).
  const { data: tamar } = usePolling(fetchTamar, {
    intervalMs: 5 * 60 * 1000,
    persistKey: 'tamar_bcra',
  })

  const [modalAbierto, setModalAbierto] = useState(false)
  const [tamarSerie, setTamarSerie] = useState(null)
  const [ipcSerie, setIpcSerie] = useState(null)
  const [cargando, setCargando] = useState(false)

  // Se piden los dos historiales (TAMAR e IPC) una sola vez, en paralelo, recién al
  // tocar el ícono -no en la carga inicial de la página-.
  const cargarDatos = () => {
    setCargando(true)
    Promise.all([fetchConReintento(() => fetchTamarSerie(730)), fetchConReintento(fetchInflacionMensual)])
      .then(([tamarData, ipcData]) => {
        setTamarSerie(tamarData)
        setIpcSerie(ipcData)
      })
      .catch(() => {
        setTamarSerie(null)
        setIpcSerie(null)
      })
      .finally(() => setCargando(false))
  }

  const abrirTendencia = () => {
    setModalAbierto(true)
    if (!tamarSerie || !ipcSerie) cargarDatos()
  }

  if (!tamar) return null

  return (
    <Card
      className="group animate-fade-up border-t-4 !border-t-violet-300 p-6 hover:!border-t-violet-500 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)]"
      style={{ animationDelay: '240ms' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <circle cx="7" cy="7" r="3" />
              <circle cx="17" cy="17" r="3" />
              <path strokeLinecap="round" d="M17 7L7 17" />
            </svg>
          </div>
          <p className="font-semibold text-slate-900">TAMAR (BCRA)</p>
          <button
            type="button"
            onClick={abrirTendencia}
            aria-label="Ver TAMAR contra el IPC mensual"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 transition-colors hover:bg-violet-600 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 3 6-7M18 8h3v3" />
            </svg>
          </button>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Al cierre: {formatFecha(tamar.fecha)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">TNA</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900">{tamar.valor.toFixed(2)}%</p>
            <DayChangeBadge current={tamar.valor} previous={tamar.valorAnterior} />
          </div>
        </div>
        {tamar.tea !== null && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">TEA</p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-slate-900">{tamar.tea.toFixed(2)}%</p>
              <DayChangeBadge current={tamar.tea} previous={tamar.teaAnterior} />
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Tasa de referencia del BCRA para depósitos del segmento corporativo e institucional
        (operaciones desde $1.000M).
      </p>

      {modalAbierto && (
        <ModalTendencia
          onClose={() => setModalAbierto(false)}
          tamarSerie={tamarSerie}
          ipcSerie={ipcSerie}
          cargando={cargando}
          onReintentar={cargarDatos}
        />
      )}
    </Card>
  )
}
