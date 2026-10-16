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

// Reuniones del FOMC (inicio y día de la decisión), copiadas del calendario oficial:
// federalreserve.gov/monetarypolicy/fomccalendars.htm. No hay API para esto. La Fed
// publica el calendario del año siguiente a mitad de año: hay que sumarlo antes de que
// se termine esta lista (después de la última fecha, la línea simplemente no aparece).
const REUNIONES_FOMC = [
  ['2026-10-27', '2026-10-28'],
  ['2026-12-08', '2026-12-09'],
  ['2027-01-26', '2027-01-27'],
  ['2027-03-16', '2027-03-17'],
  ['2027-04-27', '2027-04-28'],
  ['2027-06-08', '2027-06-09'],
  ['2027-07-27', '2027-07-28'],
  ['2027-09-14', '2027-09-15'],
  ['2027-10-26', '2027-10-27'],
  ['2027-12-07', '2027-12-08'],
]
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const hoyArgentina = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())

function proximaReunion() {
  const hoy = hoyArgentina()
  const reunion = REUNIONES_FOMC.find(([, fin]) => fin >= hoy)
  if (!reunion) return null
  const [inicio, fin] = reunion
  const dias = Math.round((Date.parse(inicio) - Date.parse(hoy)) / 86400000)
  const cuando = dias > 1 ? `en ${dias} días` : dias === 1 ? 'mañana' : dias === 0 ? 'empieza hoy' : 'en curso'
  const mesInicio = Number(inicio.slice(5, 7)) - 1
  const mesFin = Number(fin.slice(5, 7)) - 1
  const fecha =
    mesInicio === mesFin
      ? `${Number(inicio.slice(8, 10))} y ${Number(fin.slice(8, 10))} de ${MESES[mesFin]}`
      : `${Number(inicio.slice(8, 10))} de ${MESES[mesInicio]} y ${Number(fin.slice(8, 10))} de ${MESES[mesFin]}`
  return { fecha, cuando }
}

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
// haber subas y bajas), así que los textos hablan del promedio y no de un camino. Es una
// sola frase: que el bono rinde más o menos que la tasa ya lo dicen el número y la cuenta.
function lecturaDelMercado(pb) {
  if (pb <= -UMBRAL_PB)
    return {
      etiqueta: 'Promedio esperado: más bajo',
      clase: 'bg-sky-50 text-sky-700 ring-sky-600/20',
      borde: '!border-t-sky-600',
      icono: 'bg-sky-50 text-sky-700 group-hover:bg-sky-600 group-hover:text-white',
      flecha: 'M19 9l-7 7-7-7',
      texto: 'El mercado espera que, en promedio, la tasa de la Fed se mantenga por debajo de los niveles actuales durante los próximos dos años.',
    }
  if (pb >= UMBRAL_PB)
    return {
      etiqueta: 'Promedio esperado: más alto',
      clase: 'bg-amber-50 text-amber-700 ring-amber-600/20',
      borde: '!border-t-amber-500',
      icono: 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white',
      flecha: 'M5 15l7-7 7 7',
      texto: 'El mercado espera que, en promedio, la tasa de la Fed se mantenga por encima de los niveles actuales durante los próximos dos años.',
    }
  return {
    etiqueta: 'Promedio esperado: similar',
    clase: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    borde: '!border-t-slate-300',
    icono: 'bg-slate-100 text-slate-600 group-hover:bg-slate-500 group-hover:text-white',
    flecha: 'M5 12h14',
    texto: 'El mercado espera que, en promedio, la tasa de la Fed se mantenga cerca de los niveles actuales durante los próximos dos años.',
  }
}

// Edificio con columnas: la Reserva Federal.
const iconoFed = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
  </svg>
)

// Línea que sigue punteada hacia adelante: lo que se espera.
const iconoExpectativa = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M3 17l4-4 4 2" />
    <path d="M11 15l4-4 6-3" strokeDasharray="2 2.5" />
    <path d="M3 21h18" />
  </svg>
)

// Texto de método, compartido por la versión a la vista (compu) y la plegada (celular).
const textoMetodologia = (
  <>
    El rendimiento del bono a 2 años refleja, en forma aproximada, el{' '}
    <strong className="font-semibold text-slate-600">promedio</strong> que el mercado espera para la tasa de la Fed
    durante esos dos años (no el nivel exacto dentro de dos años), más una pequeña prima por plazo. Es una lectura del
    mercado, no un pronóstico.
  </>
)

const CLASE_TARJETA =
  'group flex flex-col animate-fade-up border-t-4 p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-1 hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none lg:row-span-2 lg:grid lg:grid-rows-subgrid'
const CLASE_NOTA = 'mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500 lg:mt-0'

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
  const reunion = proximaReunion()
  const diferenciaPb = conNumero(a2) ? Math.round((a2 - fed.efectiva) * 100) : null
  const lectura = diferenciaPb !== null ? lecturaDelMercado(diferenciaPb) : null

  return (
    <>
      {/* Dos tarjetas separadas: el dato de la Fed, que es lo que se busca primero, y la
          lectura del mercado. En la compu van lado a lado y comparten filas (subgrid), así
          las dos notas al pie arrancan sobre la misma línea; en el celular, una abajo de la
          otra. */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className={`${CLASE_TARJETA} !border-t-brand-500`} style={{ animationDelay: '560ms' }}>
          <div>
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
            {/* La próxima reunión completa el espacio que la tarjeta de Expectativas ocupa con
                su frase, y es el dato que más se pregunta después de la tasa. */}
            {reunion && (
              <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true">
                  <rect x="3.5" y="5" width="17" height="15" rx="2" />
                  <path strokeLinecap="round" d="M3.5 10h17M8 3v4M16 3v4" />
                </svg>
                <span>
                  Próxima reunión de la Fed: <strong className="font-semibold text-slate-800">{reunion.fecha}</strong>
                  <span className="text-slate-500"> · {reunion.cuando}</span>
                </span>
              </div>
            )}
          </div>

          <p className={CLASE_NOTA}>
            Es la tasa a la que los bancos de EE.UU. se prestan entre sí de un día para otro. La Reserva Federal fija
            su rango en las ocho reuniones anuales del FOMC, y de ella dependen las demás tasas en dólares.
          </p>
        </Card>

        {lectura && (
          <Card className={`${CLASE_TARJETA} ${lectura.borde}`} style={{ animationDelay: '640ms' }}>
            <div>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ease-out group-hover:scale-110 ${lectura.icono}`}>
                  {iconoExpectativa}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Expectativas</p>
                  <p className="text-xs text-slate-500">Treasury a 2 años contra la tasa de la Fed</p>
                </div>
              </div>

              {/* De arriba hacia abajo: la conclusión (número y estado), la cuenta como dato
                  secundario y la frase. */}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="text-3xl font-bold tabular-nums text-slate-900">{formatPb(diferenciaPb)}</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${lectura.clase}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 shrink-0" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={lectura.flecha} />
                  </svg>
                  {lectura.etiqueta}
                </span>
              </div>
              <span className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-500">
                Treasury 2A {formatTasa(a2)} − tasa efectiva {formatTasa(fed.efectiva)}
              </span>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{lectura.texto}</p>
            </div>

            {/* El detalle de cómo se lee: a la vista en la compu; en el celular, plegado para
                que la tarjeta no se haga eterna. */}
            <div className={CLASE_NOTA}>
              <p className="hidden sm:block">{textoMetodologia}</p>
              <details className="group/detalle sm:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-slate-600 [&::-webkit-details-marker]:hidden">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 shrink-0 transition-transform group-open/detalle:rotate-90" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  ¿Cómo se interpreta?
                </summary>
                <p className="mt-2">{textoMetodologia}</p>
              </details>
            </div>
          </Card>
        )}
      </div>

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
