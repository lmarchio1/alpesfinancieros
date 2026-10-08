import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Gráfico de evolución en una capa aparte, con selector de rango y seguimiento con mouse
// o dedo. Mismo patrón que la tendencia de Reservas; lo usan la inflación esperada
// (Tasas EEUU) y el riesgo país (Renta Fija). La serie se pide recién al abrirlo.
//
// cargar: función async que devuelve { puntos: [{ fecha: 'AAAA-MM-DD', valor }], completa }.
// "completa" en false indica que vino una historia parcial (se avisa debajo del gráfico).

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const etiquetaMes = (iso) => `${MESES_CORTOS[Number(iso.slice(5, 7)) - 1]}-${iso.slice(2, 4)}`
const formatFecha = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

// Escalones "lindos" para el eje (1, 2, 2,5, 5 o 10 por una potencia de 10), como el
// resto de los gráficos del sitio.
function pasoLindo(rango, objetivo) {
  const crudo = rango / objetivo
  const magnitud = Math.pow(10, Math.floor(Math.log10(crudo)))
  const resto = crudo / magnitud
  return (resto > 5 ? 10 : resto > 2.5 ? 5 : resto > 2 ? 2.5 : resto > 1 ? 2 : 1) * magnitud
}

function Grafico({ puntos, esMovil, color, formatoValor, formatoEje, descripcion }) {
  const [activo, setActivo] = useState(null)
  const svgRef = useRef(null)
  useEffect(() => setActivo(null), [puntos])

  const ancho = esMovil ? 360 : 680
  const alto = esMovil ? 280 : 300
  const margen = esMovil ? { top: 20, right: 14, bottom: 30, left: 50 } : { top: 20, right: 20, bottom: 34, left: 58 }
  const fuente = esMovil ? 12 : 11
  const anchoPlot = ancho - margen.left - margen.right
  const altoPlot = alto - margen.top - margen.bottom

  const valores = puntos.map((p) => p.valor)
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  // Un poco de aire arriba y abajo, y escalones más bien finos: con escalones gruesos el
  // redondeo del techo dejaba hasta un tercio del gráfico vacío (riesgo país a 4 años:
  // máximo 2.827 y eje hasta 4.000).
  const holgura = (maximo - minimo || Math.abs(maximo) * 0.05 || 1) * 0.08
  const paso = pasoLindo(maximo - minimo + 2 * holgura, esMovil ? 5 : 6)
  const desde = Math.floor((minimo - holgura) / paso) * paso
  const hasta = Math.ceil((maximo + holgura) / paso) * paso
  const marcas = []
  for (let v = desde; v <= hasta + paso / 1000; v += paso) marcas.push(Number(v.toFixed(6)))

  const x = (i) => margen.left + (puntos.length === 1 ? 0 : (i / (puntos.length - 1)) * anchoPlot)
  const y = (v) => margen.top + altoPlot - ((v - desde) / (hasta - desde || 1)) * altoPlot
  const linea = puntos.map((p, i) => `${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
  const area = `M${x(0)},${margen.top + altoPlot} L${linea.split(' ').join(' L')} L${x(puntos.length - 1)},${margen.top + altoPlot} Z`

  // Una etiqueta por mes calendario (o cada N meses), anclada al primer día hábil de ese
  // mes. El paso depende de cuántos meses se ven de verdad, no del rango elegido.
  const mesesVisibles = (Date.parse(puntos.at(-1).fecha) - Date.parse(puntos[0].fecha)) / (30.44 * 86400000)
  const pasoMeses = esMovil
    ? mesesVisibles <= 4 ? 1 : mesesVisibles <= 8 ? 2 : mesesVisibles <= 14 ? 3 : mesesVisibles <= 26 ? 6 : 12
    : mesesVisibles <= 7 ? 1 : mesesVisibles <= 13 ? 2 : mesesVisibles <= 26 ? 4 : 6
  const etiquetasX = []
  let ultimoMes = null
  puntos.forEach((p, i) => {
    const mes = p.fecha.slice(0, 7)
    if (mes === ultimoMes) return
    ultimoMes = mes
    const indiceMes = Number(mes.slice(0, 4)) * 12 + Number(mes.slice(5, 7)) - 1
    if (indiceMes % pasoMeses === 0 && x(i) > margen.left + 14 && x(i) < ancho - margen.right - 14) etiquetasX.push(i)
  })

  const iMin = valores.indexOf(minimo)
  const iMax = valores.indexOf(maximo)
  const idGradiente = `gradienteHistoria-${color.replace('#', '')}`

  const indiceDesde = (clientX) => {
    const rect = svgRef.current.getBoundingClientRect()
    const enDibujo = ((clientX - rect.left) / rect.width) * ancho
    const i = Math.round(((enDibujo - margen.left) / anchoPlot) * (puntos.length - 1))
    return Math.min(Math.max(i, 0), puntos.length - 1)
  }
  const alTocar = (e) => {
    e.preventDefault()
    setActivo(indiceDesde(e.touches[0].clientX))
  }

  return (
    <div>
      <svg ref={svgRef} viewBox={`0 0 ${ancho} ${alto}`} className="h-auto w-full touch-none" role="img" aria-label={descripcion}>
        <defs>
          <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {marcas.map((v) => (
          <g key={v}>
            <line x1={margen.left} x2={ancho - margen.right} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={margen.left - 8} y={y(v) + 4} textAnchor="end" fontSize={fuente} className="fill-slate-400">
              {formatoEje(v)}
            </text>
          </g>
        ))}

        {etiquetasX.map((i) => (
          <text key={i} x={x(i)} y={alto - 10} textAnchor="middle" fontSize={fuente} className="fill-slate-400">
            {etiquetaMes(puntos[i].fecha)}
          </text>
        ))}

        <path d={area} fill={`url(#${idGradiente})`} />
        <polyline points={linea} fill="none" stroke={color} strokeWidth={esMovil ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(iMin)} cy={y(minimo)} r="4" fill="#e11d48" />
        <circle cx={x(iMax)} cy={y(maximo)} r="4" fill="#059669" />

        {activo !== null && puntos[activo] && (() => {
          const px = x(activo)
          const py = y(puntos[activo].valor)
          const anchoCaja = esMovil ? 110 : 100
          const xCaja = Math.min(Math.max(px - anchoCaja / 2, margen.left), ancho - margen.right - anchoCaja)
          const yCaja = py - 44 > margen.top ? py - 44 : py + 12
          return (
            <g pointerEvents="none">
              <line x1={px} x2={px} y1={margen.top} y2={margen.top + altoPlot} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx={px} cy={py} r="5" fill={color} stroke="white" strokeWidth="2" />
              <rect x={xCaja} y={yCaja} width={anchoCaja} height={32} rx="5" fill="#1e293b" />
              <text x={xCaja + anchoCaja / 2} y={yCaja + 13} textAnchor="middle" fontSize={fuente - 1} className="fill-slate-300">
                {formatFecha(puntos[activo].fecha)}
              </text>
              <text x={xCaja + anchoCaja / 2} y={yCaja + 26} textAnchor="middle" fontSize={fuente + 1} className="fill-white font-bold">
                {formatoValor(puntos[activo].valor)}
              </text>
            </g>
          )
        })()}

        {/* Franja invisible sobre todo el dibujo: el seguimiento engancha desde cualquier
            punto, no solo encima de la línea. */}
        <rect
          x={margen.left}
          y={margen.top}
          width={anchoPlot}
          height={altoPlot}
          fill="transparent"
          style={{ touchAction: 'none' }}
          onMouseMove={(e) => setActivo(indiceDesde(e.clientX))}
          onMouseLeave={() => setActivo(null)}
          onTouchStart={alTocar}
          onTouchMove={alTocar}
          onTouchEnd={() => setActivo(null)}
        />
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-600" />
          Mínimo: <strong className="text-slate-900">{formatoValor(minimo)}</strong>
          <span className="text-slate-400">({formatFecha(puntos[iMin].fecha)})</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          Máximo: <strong className="text-slate-900">{formatoValor(maximo)}</strong>
          <span className="text-slate-400">({formatFecha(puntos[iMax].fecha)})</span>
        </span>
      </div>
    </div>
  )
}

export default function HistoriaModal({
  onClose,
  titulo,
  subtitulo,
  cargar,
  rangos,
  rangoInicial,
  color,
  formatoValor,
  formatoEje,
  esMovil,
}) {
  const [rango, setRango] = useState(rangoInicial)
  const [historia, setHistoria] = useState(null)
  const [fallo, setFallo] = useState(false)
  // La función de carga se toma la del momento de abrir: no se vuelve a pedir.
  const [cargaInicial] = useState(() => cargar)

  useEffect(() => {
    let vigente = true
    cargaInicial()
      .then((h) => vigente && setHistoria(h))
      .catch(() => vigente && setFallo(true))
    return () => {
      vigente = false
    }
  }, [cargaInicial])

  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onClose])

  const puntos = useMemo(() => {
    if (!historia?.puntos?.length) return []
    const meses = rangos.find((r) => r.id === rango).meses
    const corte = new Date(`${historia.puntos.at(-1).fecha}T00:00:00Z`)
    corte.setUTCMonth(corte.getUTCMonth() - meses)
    const corteIso = corte.toISOString().slice(0, 10)
    return historia.puntos.filter((p) => p.fecha >= corteIso)
  }, [historia, rango, rangos])

  // Portal al body: las tarjetas tienen transform por el hover, y adentro de un elemento
  // con transform el position:fixed deja de medirse contra la pantalla.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">{titulo}</p>
            <p className="text-xs text-slate-500">{subtitulo}</p>
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

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-xs sm:inline-flex sm:gap-0">
          {rangos.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRango(r.id)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                rango === r.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r.etiqueta}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {fallo ? (
            <p className="py-10 text-center text-sm text-slate-500">No se pudo cargar la historia. Probá de nuevo en un rato.</p>
          ) : historia === null ? (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
          ) : puntos.length < 2 ? (
            <p className="py-10 text-center text-sm text-slate-500">Todavía no hay historia suficiente para este rango.</p>
          ) : (
            <Grafico
              puntos={puntos}
              esMovil={esMovil}
              color={color}
              formatoValor={formatoValor}
              formatoEje={formatoEje}
              descripcion={titulo}
            />
          )}
        </div>

        {historia && !historia.completa && puntos.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">Historia disponible desde el {formatFecha(historia.puntos[0].fecha)}.</p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          {esMovil ? 'Deslizá el dedo' : 'Pasá el mouse'} por el gráfico para ver el valor de cada día.
        </p>
      </div>
    </div>,
    document.body,
  )
}
