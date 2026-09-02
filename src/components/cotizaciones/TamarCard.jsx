import { useEffect, useMemo, useState } from 'react'
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

// Tasa real mensual (Fisher): TNA promedio del mes -> TEM a 30 días -> comparada
// contra el IPC de ese mismo mes. Es la forma estándar de ver "cómo le fue a quien
// constituyó un plazo fijo ese mes", sin el ruido de comparar contra la inflación
// interanual (que arrastra meses muy viejos y tapa la mejora/empeoramiento reciente).
function calcularSerieMensual(tamarSerie, ipcSerie) {
  const porMes = new Map()
  for (const d of tamarSerie) {
    const mes = d.fecha.slice(0, 7)
    if (!porMes.has(mes)) porMes.set(mes, [])
    porMes.get(mes).push(d.valor)
  }
  const ipcPorMes = new Map(ipcSerie.map((d) => [d.fecha.slice(0, 7), d.valor]))

  const resultado = []
  for (const [mes, valores] of porMes) {
    if (!ipcPorMes.has(mes)) continue // mes en curso: el IPC todavía no se publicó
    const tnaProm = valores.reduce((a, b) => a + b, 0) / valores.length
    const tem = tnaProm * (30 / 365)
    const ipc = ipcPorMes.get(mes)
    const real = ((1 + tem / 100) / (1 + ipc / 100) - 1) * 100
    resultado.push({ mes, real })
  }
  return resultado.sort((a, b) => a.mes.localeCompare(b.mes))
}

const ANCHO = 640
const ALTO = 320
const MARGEN = { top: 16, right: 16, bottom: 72, left: 54 }
const ANCHO_PLOT = ANCHO - MARGEN.left - MARGEN.right
const ALTO_PLOT = ALTO - MARGEN.top - MARGEN.bottom
const CANT_TICKS_Y_OBJETIVO = 5

// Mismo criterio de escalones "lindos" que ReservasCard.jsx (1/2/2.5/5/10 x potencia
// de 10) -se duplica acá en vez de compartir un archivo de utils porque cada gráfico
// vive con su tarjeta, mismo patrón que ya usa el resto del sitio (bcraApi.js/scripts
// duplican fechaArgentinaHoy en vez de compartirla entre Node y navegador).
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

// Gráfico de barras a mano con SVG: barras arriba/abajo de una línea de base en 0%,
// azul cuando le ganó a la inflación ese mes, rosa cuando perdió.
function GraficoBarras({ datos }) {
  if (datos.length === 0) {
    return <p className="text-sm text-slate-500">No hay suficientes meses con TAMAR e IPC publicados todavía.</p>
  }

  const valores = datos.map((d) => d.real)
  const ticksY = calcularTicksY(Math.min(0, ...valores), Math.max(0, ...valores))
  const dominioMin = ticksY[0]
  const dominioMax = ticksY[ticksY.length - 1]
  const dominioRango = dominioMax - dominioMin || 1

  const yDeValor = (v) => MARGEN.top + ALTO_PLOT - ((v - dominioMin) / dominioRango) * ALTO_PLOT
  const yBase = yDeValor(0)
  const anchoBarra = ANCHO_PLOT / datos.length

  return (
    <div>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-72 w-full sm:h-80" preserveAspectRatio="none">
        {ticksY.map((v) => {
          const y = yDeValor(v)
          return (
            <g key={v}>
              <line
                x1={MARGEN.left}
                x2={ANCHO - MARGEN.right}
                y1={y}
                y2={y}
                stroke={v === 0 ? '#94a3b8' : '#e2e8f0'}
                strokeWidth={v === 0 ? 1.5 : 1}
              />
              <text x={MARGEN.left - 8} y={y} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[10px]">
                {v > 0 ? '+' : ''}
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
          className="fill-slate-500 text-[10px] font-semibold uppercase tracking-wide"
        >
          Tasa real mensual
        </text>

        {datos.map((d, i) => {
          const xCentro = MARGEN.left + anchoBarra * (i + 0.5)
          const anchoReal = anchoBarra * 0.62
          const yValor = yDeValor(d.real)
          const y = Math.min(yValor, yBase)
          const alto = Math.max(Math.abs(yValor - yBase), 1)
          const color = d.real >= 0 ? '#2563eb' : '#e11d48'
          return (
            <g key={d.mes}>
              <rect x={xCentro - anchoReal / 2} y={y} width={anchoReal} height={alto} fill={color} rx="2" />
              <text
                x={xCentro}
                y={ALTO - MARGEN.bottom + 12}
                textAnchor="end"
                transform={`rotate(-60, ${xCentro}, ${ALTO - MARGEN.bottom + 12})`}
                className="fill-slate-400 text-[9px]"
              >
                {formatMesAnio(d.mes)}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          Le ganó a la inflación
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-600" />
          Perdió contra la inflación
        </span>
      </div>
      <p className="mt-2 text-[10px] text-slate-400">
        TEM = TNA promedio del mes × (30/365). Tasa real = (1+TEM)/(1+IPC del mes) − 1.
      </p>
    </div>
  )
}

function ModalTendencia({ onClose, tamarSerie, ipcSerie, cargando, onReintentar }) {
  const datos = useMemo(
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">Tasa real mensual de TAMAR</p>
            <p className="text-xs text-slate-500">TEM del mes vs. IPC de ese mismo mes (Fisher)</p>
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

        <div className="mt-4">
          {cargando && <div className="h-72 animate-pulse rounded bg-slate-100 sm:h-80" />}
          {!cargando && datos && <GraficoBarras datos={datos} />}
          {!cargando && !datos && (
            <div className="text-center">
              <p className="text-sm text-rose-500">No se pudo cargar la tasa real. Puede ser un problema pasajero del BCRA.</p>
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
  // tocar el ícono -no en la carga inicial de la página-. El resto del cálculo
  // (agrupar por mes, TEM, Fisher) es puro trabajo en el navegador sin pedidos extra.
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
            aria-label="Ver tasa real mensual contra la inflación"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h4v6H4zM10 6h4v12h-4zM16 15h4v3h-4z" />
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
