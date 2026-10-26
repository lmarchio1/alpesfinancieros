import { useCallback, useEffect, useMemo, useState } from 'react'
import Card from '../ui/Card'
import HistoriaModal from '../ui/HistoriaModal'
import { usePolling } from '../../hooks/usePolling'
import { useEsMovil } from '../../hooks/useEsMovil'
import { fetchHistoriaItcrm, fetchItcrm, normalizarItcrm } from '../../services/itcrmApi'

// Tipo de cambio real multilateral del BCRA, al final de Tipos de Cambio. Es un índice
// (base 17/12/2015 = 100): no se lee como un precio sino como una tendencia, así que la
// tarjeta lo acompaña con su comparación contra hace un año y con dónde está frente a su
// historia desde 1997.

const conNumero = (v) => typeof v === 'number' && Number.isFinite(v)
const formatIndice = (v, decimales = 2) =>
  v.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
const formatFecha = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const variacion = (hoy, antes) => (conNumero(hoy) && conNumero(antes) && antes > 0 ? ((hoy - antes) / antes) * 100 : null)
const formatVariacion = (pct) =>
  `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

// Mismo criterio que el Índice Dólar: contra hace un año, y menos de 1% se toma como
// estable (criterio propio, no hay un umbral oficial). Si el índice baja, el peso se
// apreció en términos reales; si sube, se depreció.
const UMBRAL_PCT = 1

// Colores del ícono, el botón del gráfico, el punto de "hoy" y la línea del gráfico: los
// mismos del borde de arriba (escritos completos para que Tailwind los genere).
const ACENTOS = {
  sky: {
    icono: 'bg-sky-50 text-sky-700 group-hover:bg-sky-600 group-hover:text-white',
    boton: 'bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white',
    punto: 'bg-sky-600',
    halo: 'bg-sky-400',
    etiqueta: 'bg-sky-600 text-white',
    hex: '#0284c7',
  },
  amber: {
    icono: 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white',
    boton: 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white',
    punto: 'bg-amber-500',
    halo: 'bg-amber-400',
    etiqueta: 'bg-amber-700 text-white',
    hex: '#d97706',
  },
  slate: {
    icono: 'bg-slate-100 text-slate-600 group-hover:bg-slate-500 group-hover:text-white',
    boton: 'bg-slate-100 text-slate-600 hover:bg-slate-500 hover:text-white',
    punto: 'bg-slate-500',
    halo: 'bg-slate-400',
    etiqueta: 'bg-slate-600 text-white',
    hex: '#475569',
  },
}

function estadoDelPeso(pctAnual) {
  if (!conNumero(pctAnual)) return null
  if (pctAnual <= -UMBRAL_PCT)
    return {
      texto: 'Peso más apreciado que hace un año',
      clase: 'bg-sky-50 text-sky-700 ring-sky-600/20',
      borde: '!border-t-sky-600',
      acento: ACENTOS.sky,
      flecha: 'M19 9l-7 7-7-7',
    }
  if (pctAnual >= UMBRAL_PCT)
    return {
      texto: 'Peso más depreciado que hace un año',
      clase: 'bg-amber-50 text-amber-700 ring-amber-600/20',
      borde: '!border-t-amber-500',
      acento: ACENTOS.amber,
      flecha: 'M5 15l7-7 7 7',
    }
  return {
    texto: 'Peso estable frente a hace un año',
    clase: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    borde: '!border-t-slate-300',
    acento: ACENTOS.slate,
    flecha: 'M5 12h14',
  }
}

// Contra qué se compara: el valor de entonces y cuánto se movió desde ahí. La variación va
// en el color de su lectura (bajar = peso apreciado = azul; subir = depreciado = naranja).
function Comparacion({ etiqueta, dato, pct }) {
  if (!conNumero(dato?.valor) || !conNumero(pct)) return null
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200">
      <p className="text-[11px] text-slate-500">{etiqueta}</p>
      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 tabular-nums">
        <span className="text-sm font-semibold text-slate-800">{formatIndice(dato.valor)}</span>
        <span className={`text-xs font-semibold ${pct < 0 ? 'text-sky-700' : 'text-amber-700'}`}>{formatVariacion(pct)}</span>
      </p>
    </div>
  )
}

const COMO_SE_LEE = [
  {
    titulo: 'Si el índice baja (peso apreciado)',
    texto: 'Argentina se encarece en dólares; favorece importaciones y viajes, pero resta competitividad exportadora.',
    icono: 'bg-sky-100 text-sky-700',
    flecha: 'M19 9l-7 7-7-7',
  },
  {
    titulo: 'Si el índice sube (peso depreciado)',
    texto: 'ocurre lo inverso; mejora la competitividad para exportar, pero se encarece el exterior.',
    icono: 'bg-amber-100 text-amber-700',
    flecha: 'M5 15l7-7 7 7',
  },
]

// Los del riesgo país más 10 años: el BCRA publica la serie desde 1997, y a esa escala se
// ven los ciclos completos de atraso y corrección del tipo de cambio.
const RANGOS = [
  { id: '6m', etiqueta: '6 meses', meses: 6 },
  { id: '1a', etiqueta: '1 año', meses: 12 },
  { id: '2a', etiqueta: '2 años', meses: 24 },
  { id: '4a', etiqueta: '4 años', meses: 48 },
  { id: '10a', etiqueta: '10 años', meses: 120 },
]

// Globo: el peso contra el mundo.
const iconoItcrm = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5s-1.1 6.2-3.3 8.5c-2.2-2.3-3.3-5.1-3.3-8.5s1.1-6.2 3.3-8.5z" />
  </svg>
)

// Barra de dónde está hoy frente a toda su historia (mínimo a máximo desde 1997). Los
// rótulos se corren según la posición para no salirse por los bordes.
//
// Para que se lea de un vistazo: las puntas llevan el color de su lado, el promedio es una
// marca que cruza la barra con su etiqueta, y "hoy" es la marca fuerte, con un halo que
// late y que al aparecer se desliza desde la punta izquierda hasta su lugar.
function Termometro({ hoy, promedio, minimo, maximo, acento }) {
  const posicion = (v) => Math.min(100, Math.max(0, ((v - minimo.valor) / (maximo.valor - minimo.valor)) * 100))
  const marcaPromedio = posicion(promedio)
  const [marcaHoy, setMarcaHoy] = useState(0)
  useEffect(() => {
    // Con un temporizador y no con requestAnimationFrame: este último se pausa en pestañas
    // en segundo plano, y la marca podía quedar clavada en la punta.
    const espera = setTimeout(() => setMarcaHoy(posicion(hoy)), 60)
    return () => clearTimeout(espera)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoy, minimo.valor, maximo.valor])
  const deslizar = 'transition-[left,transform] duration-[1200ms] ease-out motion-reduce:transition-none'
  return (
    <div>
      <div className="relative pb-7 pt-7">
        <div
          className={`absolute top-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums shadow-sm ${acento.etiqueta} ${deslizar}`}
          style={{ left: `${marcaHoy}%`, transform: `translateX(-${marcaHoy}%)` }}
        >
          Hoy {formatIndice(hoy, 1)}
        </div>
        <div className="relative h-2.5 rounded-full bg-gradient-to-r from-sky-300 via-slate-200 to-amber-300 shadow-inner">
          {/* Puntas: el mínimo (azul) y el máximo (naranja) históricos. */}
          <span className="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-500 shadow" />
          <span className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-white bg-amber-500 shadow" />
          {/* Promedio: una marca que cruza la barra. */}
          <span
            className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-700 ring-2 ring-white"
            style={{ left: `${marcaPromedio}%` }}
          />
          {/* Hoy: el punto fuerte, con un halo que late (quieto si se piden menos animaciones). */}
          <span className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${deslizar}`} style={{ left: `${marcaHoy}%` }}>
            <span className={`absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:hidden ${acento.halo}`} />
            <span className={`relative block h-5 w-5 rounded-full border-[3px] border-white shadow-md ${acento.punto}`} />
          </span>
        </div>
        <div
          className="absolute bottom-0 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-700 ring-1 ring-inset ring-slate-300"
          style={{ left: `${marcaPromedio}%`, transform: `translateX(-${marcaPromedio}%)` }}
        >
          Promedio histórico {formatIndice(promedio, 1)}
        </div>
      </div>
      {/* Los extremos de la barra: qué significa cada punta, en el color de su lectura, y
          al lado el valor récord de ese lado (debajo, si no entra). */}
      <div className="mt-2 flex items-start justify-between gap-3">
        {[
          { texto: 'Más apreciado', dato: minimo, clase: 'bg-sky-50 text-sky-700 ring-sky-600/20', flecha: 'M15 19l-7-7 7-7', alinear: 'items-start' },
          { texto: 'Más depreciado', dato: maximo, clase: 'bg-amber-50 text-amber-700 ring-amber-600/20', flecha: 'M9 5l7 7-7 7', alinear: 'items-end' },
        ].map((punta) => (
          <div
            key={punta.texto}
            className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 ${punta.alinear === 'items-end' ? 'flex-row-reverse text-right' : ''}`}
          >
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${punta.clase}`}>
              {punta.alinear === 'items-start' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 shrink-0" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={punta.flecha} />
                </svg>
              )}
              {punta.texto}
              {punta.alinear === 'items-end' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 shrink-0" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={punta.flecha} />
                </svg>
              )}
            </span>
            <span className="text-[11px] tabular-nums text-slate-500">
              {punta.alinear === 'items-start' ? 'mín.' : 'máx.'} {formatIndice(punta.dato.valor, 1)} ({punta.dato.fecha.slice(0, 4)})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ItcrmCard() {
  const esMovil = useEsMovil()
  const [historiaAbierta, setHistoriaAbierta] = useState(false)
  const fetcher = useCallback(() => fetchItcrm(), [])
  const { data: crudo } = usePolling(fetcher, {
    // El BCRA lo actualiza cada varios días: alcanza con revisar cada seis horas.
    intervalMs: 6 * 60 * 60 * 1000,
    persistKey: 'itcrm',
  })

  // Se vuelve a validar acá porque el dato también puede venir guardado en el navegador de
  // una visita anterior (con la forma de otra versión del sitio). Lo que no pasa el control
  // no se muestra; y si aun así algo fallara al dibujar, la tarjeta está envuelta en un
  // ErrorBoundary (ver DolaresTab.jsx): desaparece ella sola y el resto sigue en pie.
  const data = useMemo(() => normalizarItcrm(crudo), [crudo])
  const ultimo = data?.ultimo
  if (!ultimo || !conNumero(ultimo.valor)) return null

  const pctMes = variacion(ultimo.valor, data.haceUnMes?.valor)
  const pctAnio = variacion(ultimo.valor, data.haceUnAnio?.valor)
  const estado = estadoDelPeso(pctAnio)
  const acento = estado?.acento ?? ACENTOS.slate
  const conHistoria = conNumero(data.promedioHistorico) && conNumero(data.minimo?.valor) && conNumero(data.maximo?.valor)

  return (
    <>
      <Card
        className={`group mt-4 animate-fade-up border-t-4 p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-1 hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none ${estado?.borde ?? '!border-t-slate-300'}`}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* En la compu, los cuadros de comparación van al pie de la columna: si la derecha
              es más alta, el aire queda arriba de ellos y no como un hueco al final. */}
          <div className="lg:flex lg:w-5/12 lg:flex-col">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ease-out group-hover:scale-110 ${acento.icono}`}>
                {iconoItcrm}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">Tipo de Cambio Real Multilateral</p>
                  <button
                    type="button"
                    onClick={() => setHistoriaAbierta(true)}
                    aria-label="Ver la evolución del tipo de cambio real multilateral"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${acento.boton}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 3 6-7M18 8h3v3" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-slate-500">Índice del BCRA · base 17/12/2015 = 100</p>
              </div>
            </div>

            {/* No es un dato del día: el BCRA lo publica cada varios días y con valores
                provisorios. La fecha va siempre a la vista, al lado del número. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="text-3xl font-bold tabular-nums text-slate-900">{formatIndice(ultimo.valor)}</p>
              <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 shrink-0" aria-hidden="true">
                  <rect x="3.5" y="5" width="17" height="15" rx="2" />
                  <path strokeLinecap="round" d="M3.5 10h17M8 3v4M16 3v4" />
                </svg>
                Al {formatFecha(ultimo.fecha)}
              </span>
              {/* Neutro: el azul y el naranja ya dicen apreciado y depreciado, y acá no hay
                  nada que alarmar. */}
              <span
                className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-300"
                title="Usa inflación estimada: el BCRA lo corrige cuando se conoce la oficial."
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.5" />
                  <path strokeLinecap="round" d="M12 7.5V12l3 2" />
                </svg>
                Dato provisorio
              </span>
              </div>
            </div>
            {estado && (
              <span className={`mt-3 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${estado.clase}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 shrink-0" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={estado.flecha} />
                </svg>
                {estado.texto}
              </span>
            )}
            {(conNumero(pctMes) || conNumero(pctAnio)) && (
              <div className="mt-4 grid grid-cols-2 gap-2 lg:mt-auto lg:pt-4">
                <Comparacion etiqueta="Hace 1 mes" dato={data.haceUnMes} pct={pctMes} />
                <Comparacion etiqueta="Hace 1 año" dato={data.haceUnAnio} pct={pctAnio} />
              </div>
            )}
          </div>

          <div className="lg:flex-1 lg:border-l lg:border-slate-100 lg:pl-8">
            {conHistoria && (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-900">
                  Evolución Histórica ({data.desde?.slice(0, 4) ?? '1997'} – Presente)
                </p>
                <div className="mt-1">
                  <Termometro hoy={ultimo.valor} promedio={data.promedioHistorico} minimo={data.minimo} maximo={data.maximo} acento={acento} />
                </div>
              </>
            )}
            {/* Cómo se lee, en dos líneas: cada una con la flecha y el color de su estado (los
                mismos de la pastilla y del termómetro). */}
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-slate-600">
              {COMO_SE_LEE.map((item) => (
                <li key={item.titulo} className="flex items-start gap-2.5">
                  <span className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${item.icono}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.flecha} />
                    </svg>
                  </span>
                  <span>
                    <strong className="font-semibold text-slate-800">{item.titulo}:</strong> {item.texto}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-4 border-t border-slate-100 pt-2.5 text-xs leading-relaxed text-slate-500">
          Mide el peso frente a las monedas de los principales socios comerciales de Argentina, ajustado por la
          inflación de cada país. Fuente: BCRA.
        </p>
      </Card>

      {historiaAbierta && (
        <HistoriaModal
          onClose={() => setHistoriaAbierta(false)}
          titulo="Tipo de Cambio Real Multilateral"
          subtitulo="Índice del BCRA, base 17/12/2015 = 100 · dato diario, los más recientes provisorios"
          cargar={fetchHistoriaItcrm}
          rangos={RANGOS}
          rangoInicial="4a"
          color={acento.hex}
          formatoValor={(v) => formatIndice(v)}
          formatoEje={(v) => v.toLocaleString('es-AR', { maximumFractionDigits: 1 })}
          esMovil={esMovil}
        />
      )}
    </>
  )
}
