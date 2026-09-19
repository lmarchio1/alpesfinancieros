import { useCallback, useMemo } from 'react'
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
  { clave: 'a10', nombre: '10 años', detalle: 'Nota · Benchmark', icon: 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white' },
  { clave: 'a30', nombre: '30 años', detalle: 'Bono (T-Bond)', icon: 'bg-amber-50 text-amber-700 group-hover:bg-amber-700 group-hover:text-white' },
]

const conNumero = (v) => typeof v === 'number' && Number.isFinite(v)
const formatTasa = (v) => `${v.toFixed(2)}%`

// Estado de la curva, no un botón: pastilla sólida con el ícono de la pendiente, para que
// no se confunda con algo que se pueda tocar (los botones del sitio son sólidos también,
// pero llevan texto de acción; este lleva un ícono y describe una situación).
function EstadoCurva({ positiva }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white ${
        positiva ? 'bg-brand-600' : 'bg-rose-700'
      }`}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d={positiva ? 'M2 12L8 6l6-3' : 'M2 4l6 6 6 3'} />
      </svg>
      {positiva ? 'Curva normal' : 'Curva invertida'}
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

const ANCHO = 680
const ALTO = 300
const MARGEN = { top: 22, right: 26, bottom: 42, left: 52 }
const ANCHO_PLOT = ANCHO - MARGEN.left - MARGEN.right
const ALTO_PLOT = ALTO - MARGEN.top - MARGEN.bottom

function ticksY(min, max) {
  const paso = 0.25
  const inicio = Math.floor(min / paso) * paso
  const fin = Math.ceil(max / paso) * paso
  const t = []
  for (let v = inicio; v <= fin + 0.001; v += paso) t.push(Number(v.toFixed(2)))
  return t
}

// Plazos que llevan el valor escrito arriba del punto: los cuatro de referencia. Poner
// los doce amontonaría números ilegibles, sobre todo en el celular.
const PLAZOS_ROTULADOS = new Set(['m3', 'a2', 'a10', 'a30'])

// Vértices con línea guía vertical: los tramos que estructuran la curva.
const VERTICES = new Set(['a2', 'a10', 'a30'])

// El eje X va por raíz cuadrada de los años, no un plazo por casillero: con casilleros
// parejos, los ocho plazos de menos de 3 años se comen media pantalla y el salto de 10 a
// 20 años aparece como un acantilado que no existe. Con la raíz, la distancia entre dos
// plazos refleja cuánto tiempo hay de verdad entre ellos, sin aplastar el tramo corto
// contra el margen izquierdo (que es lo que pasaría con una escala de años lisa).
const posicionX = (anios) => Math.sqrt(anios)

function GraficoCurva({ hoy, referencia }) {
  const plazos = PLAZOS.filter((p) => conNumero(hoy[p.clave]))
  if (plazos.length < 3) return null

  const valores = plazos.flatMap((p) => [hoy[p.clave], referencia?.[p.clave]].filter(conNumero))
  const marcas = ticksY(Math.min(...valores), Math.max(...valores))
  const minY = marcas[0]
  const maxY = marcas[marcas.length - 1]

  const xMin = posicionX(plazos[0].anios)
  const xMax = posicionX(plazos[plazos.length - 1].anios)
  const x = (anios) => MARGEN.left + ((posicionX(anios) - xMin) / (xMax - xMin)) * ANCHO_PLOT
  const y = (v) => MARGEN.top + ALTO_PLOT - ((v - minY) / (maxY - minY || 1)) * ALTO_PLOT
  const linea = (fila) =>
    plazos
      .map((p) => (conNumero(fila?.[p.clave]) ? `${x(p.anios)},${y(fila[p.clave])}` : null))
      .filter(Boolean)
      .join(' ')

  // Con la escala por raíz, los plazos cortos quedan cerca entre sí: se rotulan de a uno
  // por medio para que las etiquetas no se toquen.
  const etiquetaVisible = (p, i) => p.anios >= 1 || i % 2 === 0

  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img" aria-label="Curva de rendimientos del Tesoro de Estados Unidos">
      <defs>
        {/* Sombra nativa de SVG: el filtro por CSS no se dibuja en Safari de iPhone. */}
        <filter id="sombraCurvaHoy" x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f766e" floodOpacity="0.35" />
        </filter>
      </defs>

      {marcas.map((v) => (
        <g key={v}>
          <line x1={MARGEN.left} x2={MARGEN.left + ANCHO_PLOT} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={MARGEN.left - 10} y={y(v) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">
            {v.toFixed(2)}%
          </text>
        </g>
      ))}

      {/* Guías verticales en los vértices de referencia: con el eje por raíz de los años,
          ayudan a ubicar dónde cae cada tramo sin contar puntos. */}
      {plazos
        .filter((p) => VERTICES.has(p.clave))
        .map((p) => (
          <line
            key={`guia-${p.clave}`}
            x1={x(p.anios)}
            x2={x(p.anios)}
            y1={MARGEN.top}
            y2={MARGEN.top + ALTO_PLOT}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        ))}

      {plazos.map((p, i) =>
        etiquetaVisible(p, i) ? (
          <text key={p.clave} x={x(p.anios)} y={ALTO - 14} textAnchor="middle" className="fill-slate-500 text-[11px]">
            {p.corta}
          </text>
        ) : null,
      )}

      {referencia && (
        <polyline points={linea(referencia)} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
      )}
      <polyline points={linea(hoy)} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" filter="url(#sombraCurvaHoy)" />
      {plazos.map((p) => (
        <g key={p.clave}>
          <circle cx={x(p.anios)} cy={y(hoy[p.clave])} r="3.5" fill="#0f766e" />
          {PLAZOS_ROTULADOS.has(p.clave) && (
            <text x={x(p.anios)} y={y(hoy[p.clave]) - 12} textAnchor="middle" className="fill-slate-700 text-[11px] font-semibold">
              {hoy[p.clave].toFixed(2)}%
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export default function TreasuriesTab() {
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
        <Card className="mt-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">Pendiente de la curva (10A − 2A)</p>
              <p className="text-xs text-slate-500">
                Diferencial entre la Nota a 10 años y la de 2 años: {formatTasa(hoy.a10)} − {formatTasa(hoy.a2)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <EstadoCurva positiva={pendiente >= 0} />
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
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Un diferencial positivo refleja una curva normal: a mayor plazo, mayor retorno. Cuando se comprime o se
            invierte, suele anticipar una desaceleración o un cambio en la política monetaria.
          </p>
        </Card>
      )}

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div>
            <p className="font-semibold text-slate-900">Curva de rendimientos</p>
            <p className="max-w-md text-xs text-slate-500">
              Rendimiento anual de cada plazo, del más corto al más largo.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
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
        <div className="mt-3">
          <GraficoCurva hoy={hoy} referencia={referencia} />
        </div>

        {/* El gráfico rotula solo los cuatro plazos de las tarjetas: acá está el valor de
            todos, para leer la curva punto por punto sin depender de pasar el mouse
            (que en el celular directamente no existe). */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Todos los plazos</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {PLAZOS.filter((p) => conNumero(hoy[p.clave])).map((p) => {
              const variacion = previo ? enPb(hoy[p.clave], previo[p.clave]) : null
              return (
                <div key={p.clave} className="rounded-lg bg-slate-50 px-2.5 py-2 text-center ring-1 ring-inset ring-slate-200">
                  <p className="text-[11px] font-medium text-slate-500">{p.etiqueta}</p>
                  <p className="text-sm font-bold tabular-nums text-slate-900">{formatTasa(hoy[p.clave])}</p>
                  {variacion !== null && (
                    <p className={`text-[11px] tabular-nums ${variacion >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatPb(variacion)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="mt-5 flex items-start gap-2 rounded-lg bg-black/30 px-4 py-3 ring-1 ring-inset ring-white/10">
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
