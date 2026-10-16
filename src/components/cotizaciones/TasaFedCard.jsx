import { useCallback, useState } from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import HistoriaModal from '../ui/HistoriaModal'
import { usePolling } from '../../hooks/usePolling'
import { useEsMovil } from '../../hooks/useEsMovil'
import { fetchHistoriaFed, fetchTasaFed } from '../../services/fedApi'

// Tasa de la Reserva Federal (tasa efectiva y rango objetivo), con lo que descuenta el
// mercado para los próximos dos años según el Treasury a 2 años. Va al final de la
// pestaña Tasas EEUU, que le pasa el rendimiento a 2 años del último cierre.

const conNumero = (v) => typeof v === 'number' && Number.isFinite(v)
const formatTasa = (v) => `${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
const formatFecha = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const formatPb = (pb) => `${pb >= 0 ? '+' : '−'}${Math.abs(pb)} pb`

// Mismos rangos que el riesgo país: la serie guardada cubre 4 años.
const RANGOS = [
  { id: '6m', etiqueta: '6 meses', meses: 6 },
  { id: '1a', etiqueta: '1 año', meses: 12 },
  { id: '2a', etiqueta: '2 años', meses: 24 },
  { id: '4a', etiqueta: '4 años', meses: 48 },
]

// Diferencia entre el Treasury a 2 años y la tasa efectiva. Con menos de 15 pb para
// cualquier lado se lee como "promedio similar al actual": es un criterio propio (no hay un
// umbral oficial), del orden de la mitad de un movimiento típico de la Fed (25 pb).
const UMBRAL_PB = 15

// El Treasury a 2 años refleja el promedio esperado de todo el período (en el medio puede
// haber subas y bajas), así que los textos hablan del promedio y no de un camino.
function lecturaDelMercado(pb) {
  if (pb <= -UMBRAL_PB)
    return {
      etiqueta: 'Promedio esperado: más bajo',
      clase: 'bg-sky-50 text-sky-700 ring-sky-600/20',
      acento: 'text-sky-700',
      flecha: 'M19 9l-7 7-7-7',
      texto:
        'El bono a 2 años rinde menos que la tasa actual: el mercado espera que, en promedio, la tasa de la Fed se mantenga por debajo de los niveles actuales durante los próximos dos años.',
    }
  if (pb >= UMBRAL_PB)
    return {
      etiqueta: 'Promedio esperado: más alto',
      clase: 'bg-amber-50 text-amber-700 ring-amber-600/20',
      acento: 'text-amber-700',
      flecha: 'M5 15l7-7 7 7',
      texto:
        'El bono a 2 años rinde más que la tasa actual: el mercado espera que, en promedio, la tasa de la Fed se mantenga por encima de los niveles actuales durante los próximos dos años.',
    }
  return {
    etiqueta: 'Promedio esperado: similar',
    clase: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    acento: 'text-slate-800',
    flecha: 'M5 12h14',
    texto:
      'El bono a 2 años rinde casi lo mismo que la tasa actual: el mercado espera que, en promedio, la tasa de la Fed se mantenga cerca de los niveles actuales durante los próximos dos años.',
  }
}

// Edificio con columnas: la Reserva Federal.
const iconoFed = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
  </svg>
)

export default function TasaFedCard({ a2, fecha2A }) {
  const esMovil = useEsMovil()
  const [historiaAbierta, setHistoriaAbierta] = useState(false)
  const fetcher = useCallback(() => fetchTasaFed(), [])
  const { data: fed } = usePolling(fetcher, {
    // Cambia como mucho ocho veces por año, pero conviene verlo el día que cambia.
    intervalMs: 60 * 60 * 1000,
    persistKey: 'tasa_fed',
  })

  // Si la Fed no responde y no hay nada guardado, la tarjeta no se dibuja: el resto de la
  // pestaña sigue igual.
  if (!fed || !conNumero(fed.efectiva) || !conNumero(fed.desde) || !conNumero(fed.hasta)) return null

  const cambio = fed.ultimoCambio && conNumero(fed.ultimoCambio.pb) ? fed.ultimoCambio : null
  const diferenciaPb = conNumero(a2) ? Math.round((a2 - fed.efectiva) * 100) : null
  const lectura = diferenciaPb !== null ? lecturaDelMercado(diferenciaPb) : null

  return (
    <>
      <Card className="group mt-4 animate-fade-up border-t-4 !border-t-brand-500 p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-1 hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none">
        {/* Dos columnas con la misma estructura: el dato arriba y su nota al pie abajo. Es
            una grilla de 2×2, mitad y mitad (con 5/7 el lado del mercado se veía mucho más
            ancho), para que las dos notas arranquen sobre la misma línea divisoria;
            en el celular queda todo en una columna, cada bloque con su nota. */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="lg:col-start-1 lg:row-start-1 lg:pb-4 lg:pr-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
                {iconoFed}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">Tasa de la Fed</p>
                  <button
                    type="button"
                    onClick={() => setHistoriaAbierta(true)}
                    aria-label="Ver la evolución de la tasa de la Fed"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors hover:bg-brand-600 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 3 6-7M18 8h3v3" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-slate-500">Tasa efectiva de fondos federales (EFFR)</p>
              </div>
            </div>

            <p className="mt-4 text-3xl font-bold tabular-nums text-slate-900">{formatTasa(fed.efectiva)}</p>
            {/* La fecha del cierre ya está arriba, en la pastilla de la pestaña (la del Tesoro).
                Solo se aclara cuando la de la Fed es otra: su dato sale a la mañana
                siguiente, así que a la noche suele ir un día atrás. */}
            {fed.fecha !== fecha2A && <p className="text-xs text-slate-500">Al {formatFecha(fed.fecha)}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-600">
                Rango objetivo {formatTasa(fed.desde)} – {formatTasa(fed.hasta)}
              </span>
              {cambio && (
                <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <Badge variant={cambio.pb >= 0 ? 'positive' : 'negative'}>
                    {cambio.pb >= 0 ? '▲' : '▼'} {formatPb(cambio.pb)}
                  </Badge>
                  {cambio.reciente ? 'cambio reciente' : `último cambio, vigente desde el ${formatFecha(cambio.fecha)}`}
                </span>
              )}
            </div>
          </div>

          <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:pr-8">
            Es la tasa a la que los bancos de EE.UU. se prestan entre sí de un día para otro. La Reserva Federal fija
            su rango en las ocho reuniones anuales del FOMC, y de ella dependen las demás tasas en dólares. La tasa
            efectiva es el promedio real de esas operaciones, y se mueve dentro del rango.
          </p>

          {lectura && (
            <>
              <div className="mt-6 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:border-l lg:border-slate-100 lg:pb-4 lg:pl-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qué espera el mercado</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${lectura.clase}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 shrink-0" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d={lectura.flecha} />
                    </svg>
                    {lectura.etiqueta}
                  </span>
                  {/* La cuenta en gris; el resultado, en negrita y con el color de la lectura,
                      que es adonde tiene que ir el ojo. */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-500">
                    Treasury 2A {formatTasa(a2)} − efectiva {formatTasa(fed.efectiva)} =
                    <strong className={`font-bold ${lectura.acento}`}>{formatPb(diferenciaPb)}</strong>
                  </span>
                </div>
                <p className="mt-3 text-[15px] font-medium leading-relaxed text-slate-800">{lectura.texto}</p>
              </div>

              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500 lg:col-start-2 lg:row-start-2 lg:mt-0 lg:border-l lg:pl-8">
                El rendimiento del bono a 2 años refleja, en forma aproximada, el{' '}
                <strong className="font-semibold text-slate-600">promedio</strong> que el mercado espera para la tasa de la
                Fed durante esos dos años (no el nivel exacto dentro de dos años), más una pequeña prima por plazo. Es
                una lectura del mercado, no un pronóstico.
              </p>
            </>
          )}
        </div>
      </Card>

      {historiaAbierta && (
        <HistoriaModal
          onClose={() => setHistoriaAbierta(false)}
          titulo="Tasa de la Fed (tasa efectiva)"
          subtitulo="Tasa efectiva de fondos federales (EFFR), Fed de Nueva York · dato diario"
          cargar={fetchHistoriaFed}
          rangos={RANGOS}
          rangoInicial="4a"
          color="#2065a2"
          formatoValor={formatTasa}
          formatoEje={(v) => `${v.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`}
          esMovil={esMovil}
        />
      )}
    </>
  )
}
