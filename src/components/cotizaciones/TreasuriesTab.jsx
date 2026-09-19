import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePolling } from '../../hooks/usePolling'
import { fetchCurvaTreasury } from '../../services/treasuryApi'
import { PLAZOS } from '../../utils/treasuryCurva'
import Card from '../ui/Card'
import Badge from '../ui/Badge'

// Los cuatro puntos que se miran siempre: la tasa corta (la que fija la Reserva
// Federal), el tramo que anticipa lo que viene, y los dos largos, que son la
// referencia contra la que se mide el riesgo país.
// Nomenclatura formal del Tesoro: hasta 1 año son Letras (Bills), de 2 a 10 años Notas
// (Notes) y solo 20 y 30 años son Bonos (Bonds).
const DESTACADOS = [
  { clave: 'm3', nombre: '3 meses', detalle: 'Letra (T-Bill)', icon: 'bg-sky-50 text-sky-700 group-hover:bg-sky-700 group-hover:text-white' },
  { clave: 'a2', nombre: '2 años', detalle: 'Nota (T-Note)', icon: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' },
  { clave: 'a10', nombre: '10 años', detalle: 'Nota (T-Note)', icon: 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white' },
  { clave: 'a30', nombre: '30 años', detalle: 'Bono (T-Bond)', icon: 'bg-amber-50 text-amber-700 group-hover:bg-amber-700 group-hover:text-white' },
]

const conNumero = (v) => typeof v === 'number' && Number.isFinite(v)
const formatTasa = (v) => `${v.toFixed(2)}%`

// Entre normal e invertida está el aplanamiento. "Plana" se reserva para cuando el
// diferencial de verdad está cerca de cero: con +25 pb y el 1M en 3,97% contra el 30A en
// 5,34%, la curva tiene pendiente ascendente clara y llamarla plana sería falso. El
// promedio histórico del 10A-2A es 84 pb (serie T10Y2Y de la Reserva Federal de St.
// Louis, 1976-2026), y el diferencial estuvo entre -5 y +15 pb apenas el 7% del tiempo:
// esa franja angosta es la que merece el nombre.
const PLANA_DESDE_PB = -5
const PLANA_HASTA_PB = 15

function estadoDeCurva(pendiente) {
  if (pendiente < PLANA_DESDE_PB) return 'invertida'
  if (pendiente <= PLANA_HASTA_PB) return 'plana'
  return 'normal'
}

const ESTADOS = {
  normal: {
    texto: 'Curva normal',
    color: 'bg-brand-600',
    borde: '!border-t-brand-600',
    trazo: 'M2 12L8 6l6-3',
    explicacion: (pendiente) =>
      `El diferencial es positivo (${formatPbLlano(pendiente)}): la curva mantiene la pendiente ascendente típica, a mayor plazo mayor retorno. Un estrechamiento sostenido hacia 0 pb reflejaría aplanamiento y posibles expectativas de cambio de ciclo.`,
  },
  plana: {
    texto: 'Curva plana',
    color: 'bg-[#a35f24]',
    borde: '!border-t-[#a35f24]',
    trazo: 'M2 9h12',
    explicacion: () =>
      'El diferencial está prácticamente en cero: prestar a diez años paga casi lo mismo que a dos. El aplanamiento puede venir de una suba de las tasas cortas o de una baja de las largas, y es el paso previo a una inversión.',
  },
  invertida: {
    texto: 'Curva invertida',
    color: 'bg-rose-700',
    borde: '!border-t-rose-700',
    trazo: 'M2 4l6 6 6 3',
    explicacion: () =>
      'El tramo corto rinde más que el largo. La inversión de la curva suele anticipar una desaceleración o un cambio en la política monetaria, y es la señal que históricamente precedió a las recesiones en EE.UU.',
  },
}

// Íconos de las dos tarjetas anchas: misma caja redondeada que la de las tarjetas de
// plazos, para que las seis se lean como una sola familia.
function IconoTarjeta({ className, children }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ease-out group-hover:scale-110 ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </div>
  )
}

// Una regla: la tarjeta mide una distancia (cuánto más paga el plazo largo que el corto).
const iconoPendiente = (
  <>
    <rect x="2.5" y="8.5" width="19" height="7" rx="1.5" />
    <path d="M6.5 8.5v3" />
    <path d="M10 8.5v2" />
    <path d="M13.5 8.5v3" />
    <path d="M17 8.5v2" />
  </>
)

// Ejes y una curva que sube y se aplana, la forma misma del gráfico.
const iconoCurva = (
  <>
    <path d="M4 5v14h16" />
    <path d="M7 16c2.5 0 4-6 6.5-7.5S18 7 20 6.8" />
  </>
)

// Estado de la curva, no un botón: pastilla sólida con el ícono de la pendiente, para que
// no se confunda con algo que se pueda tocar (los botones del sitio son sólidos también,
// pero llevan texto de acción; este lleva un ícono y describe una situación).
function EstadoCurva({ estado }) {
  const { texto, color, trazo } = ESTADOS[estado]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white ${color}`}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d={trazo} />
      </svg>
      {texto}
    </span>
  )
}

// Los movimientos de tasas se miden en puntos básicos (1 pb = 0,01%), no en porcentaje
// del porcentaje: decir que la de 10 años "subió 7 pb" es lo que se usa en el mercado.
//
// Verde cuando sube y rojo cuando baja, igual que el resto del sitio, más la flecha
// para que la dirección se lea sin depender del color.
const formatPb = (v) => `${v >= 0 ? '▲ +' : '▼ −'}${Math.abs(Math.round(v))} pb`
const formatPbLlano = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v))} pb`
const enPb = (hoy, antes) => (conNumero(hoy) && conNumero(antes) ? (hoy - antes) * 100 : null)

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const formatFecha = (iso) => {
  const [a, m, d] = iso.split('-')
  return `${d} de ${MESES_CORTOS[Number(m) - 1]} de ${a}`
}
const formatFechaCorta = (iso) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// El gráfico se dibuja distinto según el ancho de pantalla. No alcanza con achicar el
// mismo dibujo: el SVG escala todo por igual, así que en un celular la tipografía de
// 11px del escritorio termina midiendo 5px reales, ilegible. En pantalla chica se usa un
// lienzo más angosto (misma proporción que el teléfono), tipografía más grande en
// unidades del dibujo y menos etiquetas.
const DISENIOS = {
  escritorio: {
    ancho: 680,
    alto: 244,
    margen: { top: 26, right: 26, bottom: 38, left: 52 },
    fuenteEje: 11,
    fuenteValor: 11,
    pasoY: 0.25,
    radio: 3.5,
    // Los cortos están muy juntos: se etiqueta uno por medio.
    ejeX: (p, i) => p.anios >= 1 || i % 2 === 0,
    pilares: ['m3', 'a2', 'a10', 'a30'],
    separacion: 0.16,
  },
  celular: {
    ancho: 360,
    alto: 230,
    margen: { top: 24, right: 16, bottom: 28, left: 48 },
    fuenteEje: 13,
    fuenteValor: 13,
    pasoY: 0.5,
    radio: 4,
    ejeX: (p) => ['m3', 'a1', 'a2', 'a5', 'a10', 'a30'].includes(p.clave),
    pilares: ['m3', 'a10', 'a30'],
    separacion: 0.16,
  },
  // Ampliado: el gráfico solo, sin el texto de la tarjeta alrededor, así que se le da
  // todo el alto que en la tarjeta no entra. Es el que se abre con el botón del título.
  escritorioAmpliado: {
    ancho: 680,
    alto: 380,
    margen: { top: 28, right: 28, bottom: 44, left: 56 },
    fuenteEje: 12,
    fuenteValor: 12,
    pasoY: 0.25,
    radio: 4,
    ejeX: () => true,
    pilares: ['m3', 'a2', 'a10', 'a30'],
    separacion: 0.1,
  },
  // En el celular, el ampliado no busca mostrar todo junto como en la computadora -ahí las
  // etiquetas del tramo corto terminaban encimadas ("1M3M6M1A")-. Muestra menos cosas,
  // más grandes: la grilla cada medio punto, siete plazos en el eje y solo tres valores
  // escritos. El resto se consulta deslizando el dedo.
  celularAmpliado: {
    ancho: 360,
    alto: 440,
    margen: { top: 28, right: 20, bottom: 34, left: 48 },
    fuenteEje: 13,
    fuenteValor: 13,
    pasoY: 0.5,
    radio: 5,
    ejeX: (p) => ['m3', 'a2', 'a5', 'a10', 'a20', 'a30'].includes(p.clave),
    pilares: ['a2', 'a10'],
    separacion: 0.18,
  },
}

function useEsMovil() {
  const consulta = '(max-width: 639px)'
  const [esMovil, setEsMovil] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(consulta).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const revisar = () => setEsMovil(mq.matches)
    revisar()
    // Se escuchan los dos: el evento de la media query es el correcto, pero hay
    // navegadores -y entornos de prueba- donde el cambio de ancho no lo dispara.
    mq.addEventListener('change', revisar)
    window.addEventListener('resize', revisar)
    return () => {
      mq.removeEventListener('change', revisar)
      window.removeEventListener('resize', revisar)
    }
  }, [])
  return esMovil
}

// El eje deja un 15% de aire arriba y un 5% abajo antes de redondear al escalón: sin
// eso, el punto más alto quedaba pegado a la línea del techo y su valor parecía cortado.
function ticksY(min, max, paso) {
  const rango = max - min || paso
  const inicio = Math.floor((min - rango * 0.05) / paso) * paso
  const fin = Math.ceil((max + rango * 0.15) / paso) * paso
  const t = []
  for (let v = inicio; v <= fin + 0.001; v += paso) t.push(Number(v.toFixed(2)))
  return t
}

// Vértices con línea guía vertical: los tramos que estructuran la curva, más el 5A
// para no dejar sin referencia toda la panza de la curva.
const VERTICES = new Set(['a2', 'a5', 'a10', 'a30'])

// El eje X va por raíz cuadrada de los años, no un plazo por casillero: con casilleros
// parejos, los ocho plazos de menos de 3 años se comen media pantalla y el salto de 10 a
// 20 años aparece como un acantilado que no existe. Con la raíz, la distancia entre dos
// plazos refleja cuánto tiempo hay de verdad entre ellos, sin aplastar el tramo corto
// contra el margen izquierdo (que es lo que pasaría con una escala de años lisa).
const posicionX = (anios) => Math.sqrt(anios)

function GraficoCurva({ hoy, referencia, previo, esMovil, textoComparacion, ampliado = false }) {
  const [activo, setActivo] = useState(null)
  const svgRef = useRef(null)
  const d = DISENIOS[`${esMovil ? 'celular' : 'escritorio'}${ampliado ? 'Ampliado' : ''}`]
  const anchoPlot = d.ancho - d.margen.left - d.margen.right
  const altoPlot = d.alto - d.margen.top - d.margen.bottom

  const plazos = PLAZOS.filter((p) => conNumero(hoy[p.clave]))
  if (plazos.length < 3) return null

  const valores = plazos.flatMap((p) => [hoy[p.clave], referencia?.[p.clave]].filter(conNumero))
  const marcas = ticksY(Math.min(...valores), Math.max(...valores), d.pasoY)
  const minY = marcas[0]
  const maxY = marcas[marcas.length - 1]

  const xMin = posicionX(plazos[0].anios)
  const xMax = posicionX(plazos[plazos.length - 1].anios)
  const x = (anios) => d.margen.left + ((posicionX(anios) - xMin) / (xMax - xMin)) * anchoPlot
  const y = (v) => d.margen.top + altoPlot - ((v - minY) / (maxY - minY || 1)) * altoPlot
  const linea = (fila) =>
    plazos
      .map((p) => (conNumero(fila?.[p.clave]) ? `${x(p.anios)},${y(fila[p.clave])}` : null))
      .filter(Boolean)
      .join(' ')

  // A los pilares se les suma el plazo de mayor rendimiento: es el punto más alto del
  // dibujo y quedaba sin número, con la línea bajando después hacia un valor menor que sí
  // estaba rotulado, lo que se leía al revés de lo que pasó.
  const masAlto = plazos.reduce((a, b) => (hoy[b.clave] > hoy[a.clave] ? b : a))
  // El máximo tiene prioridad sobre los pilares: si dos rótulos caen demasiado cerca
  // -pasaba con 20A y 30A en el celular, que se leían como "5.38%5.34%"- se deja el
  // primero y se descarta el otro.
  const separacionMinima = d.ancho * d.separacion
  const rotulados = new Set()
  let ultimoX = -Infinity
  for (const p of plazos) {
    if (!d.pilares.includes(p.clave) && p.clave !== masAlto.clave) continue
    const px = x(p.anios)
    if (p.clave !== masAlto.clave && px - ultimoX < separacionMinima) continue
    if (p.clave === masAlto.clave && px - ultimoX < separacionMinima) rotulados.delete([...rotulados].pop())
    rotulados.add(p.clave)
    ultimoX = px
  }

  // Un rótulo centrado sobre el primer o el último punto se saldría del dibujo: contra
  // los bordes se alinea hacia adentro.
  const anclaje = (px) => (px > d.ancho - 40 ? 'end' : px < d.margen.left + 16 ? 'start' : 'middle')

  // Del X del mouse o del dedo al plazo más cercano: así no hay que acertarle al punto
  // -imposible en el celular-, alcanza con moverse por encima del gráfico. El
  // getBoundingClientRect pasa de píxeles de pantalla a unidades del dibujo, que no son
  // lo mismo (el SVG se estira al ancho de la tarjeta).
  const plazoDesdeClientX = (clientX) => {
    const rect = svgRef.current.getBoundingClientRect()
    const enDibujo = ((clientX - rect.left) / rect.width) * d.ancho
    let mejor = plazos[0]
    for (const p of plazos) {
      if (Math.abs(x(p.anios) - enDibujo) < Math.abs(x(mejor.anios) - enDibujo)) mejor = p
    }
    return mejor
  }
  const alMover = (e) => setActivo(plazoDesdeClientX(e.clientX))
  const alTocar = (e) => {
    e.preventDefault()
    setActivo(plazoDesdeClientX(e.touches[0].clientX))
  }

  const variacionActiva = activo && previo ? enPb(hoy[activo.clave], previo[activo.clave]) : null
  const valorReferencia = activo && referencia ? referencia[activo.clave] : null

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${d.ancho} ${d.alto}`}
      className="h-auto w-full touch-none"
      role="img"
      aria-label="Curva de rendimientos del Tesoro de Estados Unidos"
    >
      <defs>
        {/* Sombra nativa de SVG: el filtro por CSS no se dibuja en Safari de iPhone. */}
        <filter id="sombraCurvaHoy" x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f766e" floodOpacity="0.35" />
        </filter>
      </defs>

      {marcas.map((v) => (
        <g key={v}>
          <line x1={d.margen.left} x2={d.margen.left + anchoPlot} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={d.margen.left - 8} y={y(v) + 4} textAnchor="end" fontSize={d.fuenteEje} className="fill-slate-400">
            {v.toFixed(2)}%
          </text>
        </g>
      ))}

      {plazos
        .filter((p) => VERTICES.has(p.clave))
        .map((p) => (
          <line
            key={`guia-${p.clave}`}
            x1={x(p.anios)}
            x2={x(p.anios)}
            y1={d.margen.top}
            y2={d.margen.top + altoPlot}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        ))}

      {plazos.map((p, i) =>
        d.ejeX(p, i) ? (
          <text key={p.clave} x={x(p.anios)} y={d.alto - 10} textAnchor={anclaje(x(p.anios))} fontSize={d.fuenteEje} className="fill-slate-500">
            {p.corta}
          </text>
        ) : null,
      )}

      {referencia && (
        <polyline points={linea(referencia)} fill="none" stroke="#94a3b8" strokeWidth={esMovil ? 2.5 : 2} strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
      )}
      <polyline points={linea(hoy)} fill="none" stroke="#0f766e" strokeWidth={esMovil ? 3.5 : 3} strokeLinejoin="round" strokeLinecap="round" filter="url(#sombraCurvaHoy)" />
      {plazos.map((p) => (
        <g key={p.clave}>
          <circle cx={x(p.anios)} cy={y(hoy[p.clave])} r={d.radio} fill="#0f766e" />
          {rotulados.has(p.clave) && (
            <text
              x={x(p.anios)}
              // Si el punto está contra el techo, el valor va debajo: pegado al borde
              // parecía que la línea se salía del gráfico.
              y={y(hoy[p.clave]) - 12 < d.margen.top ? y(hoy[p.clave]) + 18 : y(hoy[p.clave]) - 12}
              textAnchor={anclaje(x(p.anios))}
              fontSize={d.fuenteValor}
              className="fill-slate-700 font-semibold"
            >
              {hoy[p.clave].toFixed(2)}%
            </text>
          )}
        </g>
      ))}
      {activo && conNumero(hoy[activo.clave]) && (
        (() => {
          const px = x(activo.anios)
          const py = y(hoy[activo.clave])
          const alto = conNumero(valorReferencia) ? (esMovil ? 58 : 50) : esMovil ? 44 : 38
          const ancho = esMovil ? 124 : 112
          const xCaja = Math.min(Math.max(px - ancho / 2, d.margen.left), d.ancho - d.margen.right - ancho)
          const yCaja = py - alto - 12 > d.margen.top ? py - alto - 12 : py + 14
          return (
            <g pointerEvents="none">
              <line x1={px} x2={px} y1={d.margen.top} y2={d.margen.top + altoPlot} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx={px} cy={py} r="5.5" fill="#0f766e" stroke="white" strokeWidth="2" />
              <rect x={xCaja} y={yCaja} width={ancho} height={alto} rx="6" fill="#1e293b" />
              <text x={xCaja + ancho / 2} y={yCaja + (esMovil ? 15 : 13)} textAnchor="middle" fontSize={d.fuenteEje} className="fill-slate-300">
                {activo.etiqueta}
              </text>
              <text x={xCaja + ancho / 2} y={yCaja + (esMovil ? 32 : 27)} textAnchor="middle" fontSize={d.fuenteValor + 1} className="fill-white font-bold">
                {formatTasa(hoy[activo.clave])}
                {variacionActiva !== null ? `  ${formatPbLlano(variacionActiva)}` : ''}
              </text>
              {conNumero(valorReferencia) && (
                <text x={xCaja + ancho / 2} y={yCaja + (esMovil ? 49 : 41)} textAnchor="middle" fontSize={d.fuenteEje} className="fill-slate-400">
                  {textoComparacion}: {formatTasa(valorReferencia)}
                </text>
              )}
            </g>
          )
        })()
      )}

      {/* Franja invisible sobre todo el dibujo: el seguimiento engancha desde cualquier
          punto, no solo encima de la línea. */}
      <rect
        x={d.margen.left}
        y={d.margen.top}
        width={anchoPlot}
        height={altoPlot}
        fill="transparent"
        style={{ touchAction: 'none' }}
        onMouseMove={alMover}
        onMouseLeave={() => setActivo(null)}
        onTouchStart={alTocar}
        onTouchMove={alTocar}
        onTouchEnd={() => setActivo(null)}
      />
    </svg>
  )
}

// Mismo patrón que la tendencia de Reservas: el gráfico ampliado se abre en una capa
// aparte. En el celular es la única forma de que la curva entre con todos sus plazos
// rotulados y con aire; en la tarjeta va siempre la versión compacta.
function ModalCurva({ onClose, hoy, referencia, previo, esMovil, textoComparacion }) {
  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onClose])

  // Portal al body: la tarjeta tiene transform por el efecto de hover, y dentro de un
  // elemento con transform el position:fixed deja de medirse contra la pantalla.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">Curva de rendimientos del Tesoro</p>
            <p className="text-xs text-slate-500">Cierre del {formatFecha(hoy.fecha)}</p>
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

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-[3px] w-6 shrink-0 rounded-full bg-[#0f766e]" />
            Cierre de hoy · {formatFechaCorta(hoy.fecha)}
          </span>
          {referencia && (
            <span className="inline-flex items-center gap-2">
              <span className="w-6 shrink-0 border-t-2 border-dashed border-slate-400" />
              {textoComparacion} · {formatFechaCorta(referencia.fecha)}
            </span>
          )}
        </div>

        <div className="mt-2">
          <GraficoCurva
            hoy={hoy}
            referencia={referencia}
            previo={previo}
            esMovil={esMovil}
            textoComparacion={textoComparacion}
            ampliado
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {esMovil ? 'Deslizá el dedo' : 'Pasá el mouse'} por el gráfico para ver el rendimiento de cada plazo.
        </p>
      </div>
    </div>,
    document.body,
  )
}

export default function TreasuriesTab() {
  const esMovil = useEsMovil()
  const [modalAbierto, setModalAbierto] = useState(false)
  const fetcher = useCallback(() => fetchCurvaTreasury(), [])
  const { data, error, loading, refresh } = usePolling(fetcher, {
    // Se publica una vez por día: alcanza con revisar cada hora por si la pestaña
    // quedó abierta desde antes del cierre de EE.UU.
    intervalMs: 60 * 60 * 1000,
    persistKey: 'treasury_curva',
  })

  const curva = useMemo(() => {
    const dias = (data?.dias ?? []).filter((d) => d?.fecha)
    if (dias.length === 0) return null
    const hoy = dias[dias.length - 1]
    const previo = dias[dias.length - 2] ?? null
    // La comparación del gráfico se elige por fecha, no contando ruedas: se busca el
    // cierre más cercano a 30 días atrás. Si la historia disponible es más corta (pasa
    // cuando el dato viene del Tesoro en vez de la cache), se usa el más viejo que haya
    // y el gráfico lo dice, en vez de llamarle "un mes" a diez días.
    const objetivo = new Date(`${hoy.fecha}T00:00:00Z`)
    objetivo.setUTCDate(objetivo.getUTCDate() - 30)
    const objetivoIso = objetivo.toISOString().slice(0, 10)
    const candidatos = dias.slice(0, -1)
    const referencia = candidatos.length
      ? candidatos.reduce((mejor, d) =>
          Math.abs(Date.parse(d.fecha) - Date.parse(objetivoIso)) < Math.abs(Date.parse(mejor.fecha) - Date.parse(objetivoIso)) ? d : mejor,
        )
      : null
    const diasDeDiferencia = referencia
      ? Math.round((Date.parse(hoy.fecha) - Date.parse(referencia.fecha)) / 86400000)
      : 0
    return { hoy, previo, referencia, diasDeDiferencia }
  }, [data])

  if (!data && loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    )
  }

  if (!curva) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-rose-600">{error ?? 'No se pudo obtener la curva del Tesoro.'}</p>
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

  const { hoy, previo, referencia, diasDeDiferencia } = curva
  const pendiente = enPb(hoy.a10, hoy.a2)
  const pendientePrevia = previo ? enPb(previo.a10, previo.a2) : null
  // Se dice lo que realmente se está comparando: "hace un mes" solo si de verdad es
  // aproximadamente un mes.
  const estado = conNumero(pendiente) ? estadoDeCurva(pendiente) : 'normal'
  const textoComparacion =
    diasDeDiferencia >= 25 ? 'Hace un mes' : diasDeDiferencia >= 10 ? `Hace ${diasDeDiferencia} días` : 'Cierre anterior'

  return (
    <div>
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 shadow-md shadow-black/30">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M6 19V9l6-4 6 4v10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19v-5h4v5" />
        </svg>
        <span className="text-sm font-bold uppercase tracking-wide text-white">Tesoro de EE.UU.</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Badge variant="info">Actualización diaria</Badge>
        <div className="flex items-center gap-3 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 shadow-sm backdrop-blur-sm">
          <span>Cierre del {formatFecha(hoy.fecha)}</span>
          <button type="button" onClick={refresh} className="font-semibold text-brand-300 hover:text-white hover:underline">
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DESTACADOS.filter((d) => conNumero(hoy[d.clave])).map((d, i) => {
          const variacion = previo ? enPb(hoy[d.clave], previo[d.clave]) : null
          return (
            <Card
              key={d.clave}
              className={`group animate-fade-up border-t-4 p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none ${
                variacion === null ? '!border-t-slate-200' : variacion >= 0 ? '!border-t-emerald-700' : '!border-t-rose-700'
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all duration-300 ease-out group-hover:scale-110 ${d.icon}`}>
                    {d.clave.replace('m', '').replace('a', '')}
                    {d.clave.startsWith('m') ? 'M' : 'A'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{d.nombre}</p>
                    <p className="text-xs text-slate-500">{d.detalle}</p>
                  </div>
                </div>
                {variacion !== null && (
                  <span className="shrink-0 whitespace-nowrap">
                    <Badge variant={variacion >= 0 ? 'positive' : 'negative'}>{formatPb(variacion)}</Badge>
                  </span>
                )}
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-900">{formatTasa(hoy[d.clave])}</p>
              <p className="text-xs text-slate-500">Rendimiento anual</p>
            </Card>
          )
        })}
      </div>

      {conNumero(pendiente) && (
        <Card
          className={`group animate-fade-up border-t-4 p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none ${ESTADOS[estado].borde}`}
          style={{ animationDelay: '320ms', marginTop: '1rem' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconoTarjeta className="bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white">
                {iconoPendiente}
              </IconoTarjeta>
              <div>
                <p className="font-semibold text-slate-900">Pendiente de la curva (10A − 2A)</p>
                <p className="text-xs text-slate-500">
                  Diferencial entre la Nota a 10 años y la de 2 años: {formatTasa(hoy.a10)} − {formatTasa(hoy.a2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <EstadoCurva estado={estado} />
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{formatPbLlano(pendiente)}</p>
                {conNumero(pendientePrevia) && (
                  <p className="text-xs text-slate-500">
                    {formatPbLlano(pendiente - pendientePrevia)} contra el cierre anterior
                  </p>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">{ESTADOS[estado].explicacion(pendiente)}</p>
        </Card>
      )}

      <Card
        className="group animate-fade-up border-t-4 !border-t-[#0d9488] p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none"
        style={{ animationDelay: '400ms', marginTop: '1rem' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <IconoTarjeta className="bg-teal-50 text-[#0d9488] group-hover:bg-[#0d9488] group-hover:text-white">
              {iconoCurva}
            </IconoTarjeta>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">Curva de rendimientos</p>
                <button
                  type="button"
                  onClick={() => setModalAbierto(true)}
                  aria-label="Ver el gráfico en grande"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[#0d9488] transition-colors hover:bg-[#0d9488] hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 3 6-7M18 8h3v3" />
                  </svg>
                </button>
              </div>
              <p className="max-w-md text-xs text-slate-500">
              Rendimiento anual de cada plazo, del más corto al más largo.
              <span className="hidden sm:inline"> Pasá el mouse por el gráfico para ver cada uno.</span>
              </p>
            </div>
          </div>
          <div className="hidden flex-col gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-slate-200 sm:flex">
            <span className="inline-flex items-center gap-2">
              <span className="h-[3px] w-6 shrink-0 rounded-full bg-[#0f766e]" />
              Cierre de hoy · {formatFechaCorta(hoy.fecha)}
            </span>
            {referencia && (
              <span className="inline-flex items-center gap-2">
                <span className="w-6 shrink-0 border-t-2 border-dashed border-slate-400" />
                {textoComparacion} · {formatFechaCorta(referencia.fecha)}
              </span>
            )}
          </div>
        </div>
        {/* En el celular el gráfico no entra con dignidad dentro de la tarjeta: se abre
            con el botón, a pantalla casi completa. Acá va solo la invitación. */}
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm font-semibold text-[#0d9488] ring-1 ring-inset ring-[#0d9488]/20 transition-colors hover:bg-[#0d9488] hover:text-white sm:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 3 6-7M18 8h3v3" />
          </svg>
          Ver la curva de rendimientos
        </button>

        <div className="mt-3 hidden sm:block">
          <GraficoCurva hoy={hoy} referencia={referencia} previo={previo} esMovil={esMovil} textoComparacion={textoComparacion} />
        </div>

      </Card>

      {modalAbierto && (
        <ModalCurva
          onClose={() => setModalAbierto(false)}
          hoy={hoy}
          referencia={referencia}
          previo={previo}
          esMovil={esMovil}
          textoComparacion={textoComparacion}
        />
      )}

      <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-900/20 px-4 py-3 ring-1 ring-inset ring-white/15">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-4 w-4 shrink-0 text-slate-300">
          <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8h.01M11 12h1v4h1" />
        </svg>
        <p className="text-xs text-slate-200">
          Curva oficial de rendimientos (par yield) publicada por el Departamento del Tesoro de los Estados Unidos
          al cierre de cada rueda. Es la referencia contra la que se mide el riesgo país. Valores informativos: no
          constituyen una recomendación operativa.
        </p>
      </div>
    </div>
  )
}
