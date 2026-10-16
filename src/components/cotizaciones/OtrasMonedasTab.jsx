import { useCallback, useState } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { fetchHistoriaDxy, fetchOtrasMonedas } from '../../services/forexApi'
import { DXY_PESOS } from '../../utils/dxy'
import HistoriaModal from '../ui/HistoriaModal'
import { useEsMovil } from '../../hooks/useEsMovil'
import Card from '../ui/Card'
import Badge from '../ui/Badge'

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
// "USD 1,862.98" en vez del símbolo "$" (que se confunde con el "$" de
// pesos que ya aparece arriba, en la misma tarjeta).
const formatUsd = (value, decimales = 2) =>
  `USD ${value.toLocaleString('en-US', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`
const GRAMOS_POR_ONZA_TROY = 31.1034768

const MONEDAS_INFO = {
  EUR: { nombre: 'Euro', simbolo: '€', unidad: 1, decimalesUsd: 4, decimalesInverso: 4, icon: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' },
  GBP: { nombre: 'Libra Esterlina', simbolo: '£', unidad: 1, decimalesUsd: 4, decimalesInverso: 4, icon: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white' },
  BRL: { nombre: 'Real Brasileño', simbolo: 'R$', unidad: 1, decimalesUsd: 4, decimalesInverso: 4, icon: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' },
  CLP: { nombre: 'Peso Chileno', simbolo: 'CLP', unidad: 1000, decimalesUsd: 2, decimalesInverso: 0, icon: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white' },
  COP: { nombre: 'Peso Colombiano', simbolo: 'COP', unidad: 1000, decimalesUsd: 2, decimalesInverso: 0, icon: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white' },
  UYU: { nombre: 'Peso Uruguayo', simbolo: '$U', unidad: 1, decimalesUsd: 4, decimalesInverso: 2, icon: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white' },
}

const METALES_INFO = {
  XAU: { nombre: 'Oro', simbolo: 'Au', icon: 'bg-amber-50 text-amber-700 group-hover:bg-amber-700 group-hover:text-white' },
  XAG: { nombre: 'Plata', simbolo: 'Ag', icon: 'bg-slate-100 text-slate-500 group-hover:bg-slate-500 group-hover:text-white' },
  XPT: { nombre: 'Platino', simbolo: 'Pt', icon: 'bg-cyan-50 text-cyan-700 group-hover:bg-cyan-700 group-hover:text-white' },
}

const formatFecha = (fechaIso) =>
  new Date(`${fechaIso}T00:00:00Z`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

// La fuente publica el archivo con la fecha de publicación, pero el
// contenido es el cierre del día hábil anterior a esa fecha.
const fechaCierre = (fechaIso) => {
  const d = new Date(`${fechaIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Segunda red de contención para lo mismo que valida forexApi.js: el dato guardado en
// localStorage puede venir de una versión anterior del sitio, y ahí un NaN quedó escrito
// como null -así lo serializa JSON-, que dividido daría 0 y mostraría "USD 0,00" como si
// fuera un precio real. Lo que no tiene número, no se muestra.
const conNumero = (valor) => typeof valor === 'number' && Number.isFinite(valor)
const numeroONull = (valor) => (conNumero(valor) ? valor : null)

// Colores de cada moneda en la barra de composición del DXY, de mayor a menor peso.
const DXY_COLORES = {
  EUR: 'bg-indigo-600',
  JPY: 'bg-rose-500',
  GBP: 'bg-sky-500',
  CAD: 'bg-amber-500',
  SEK: 'bg-teal-500',
  CHF: 'bg-slate-400',
}

// "Fuerte" o "débil" siempre es contra algo: acá, contra el mismo índice hace un año.
// Movimientos de menos del 1% en el año se toman como estables (criterio propio, no
// hay un umbral oficial).
const UMBRAL_ESTABLE_PCT = 1

function estadoDolar(variacionAnioPct) {
  if (!conNumero(variacionAnioPct)) return null
  if (variacionAnioPct >= UMBRAL_ESTABLE_PCT)
    return { texto: 'Dólar más fuerte que hace un año', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', flecha: 'M5 15l7-7 7 7' }
  if (variacionAnioPct <= -UMBRAL_ESTABLE_PCT)
    return { texto: 'Dólar más débil que hace un año', clase: 'bg-rose-50 text-rose-700 ring-rose-600/20', flecha: 'M19 9l-7 7-7-7' }
  return { texto: 'Dólar estable frente a hace un año', clase: 'bg-slate-100 text-slate-600 ring-slate-500/20', flecha: 'M5 12h14' }
}

const formatVariacion = (pct) =>
  `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

function Variacion({ etiqueta, pct }) {
  if (!conNumero(pct)) return null
  return (
    <span>
      {etiqueta}{' '}
      <span className={`font-semibold tabular-nums ${pct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatVariacion(pct)}</span>
    </span>
  )
}

const formatPeso = (peso) => `${(peso * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`

// Rangos como la inflación esperada: la fuente arranca en marzo de 2024, así que no
// llega a 4 años.
const RANGOS_DXY = [
  { id: '3m', etiqueta: '3 meses', meses: 3 },
  { id: '6m', etiqueta: '6 meses', meses: 6 },
  { id: '1a', etiqueta: '1 año', meses: 12 },
  { id: '2a', etiqueta: '2 años', meses: 24 },
]

// "DXY" y "U.S. Dollar Index" son marcas de ICE, y este valor es calculado por nosotros
// (puede diferir unas décimas del oficial): por eso el título es "Índice Dólar" y se
// aclara que es una réplica, en vez de presentarlo como el dato de ICE.
function TarjetaDxy({ dxy }) {
  const esMovil = useEsMovil()
  const [historiaAbierta, setHistoriaAbierta] = useState(false)
  const pct = numeroONull(dxy.variacionPct)
  const estado = estadoDolar(dxy.variacionAnioPct)
  const trendBorder = pct === null ? '!border-t-slate-200' : pct >= 0 ? '!border-t-emerald-700' : '!border-t-rose-700'
  return (
    <Card
      className={`group mb-6 animate-fade-up border-t-4 p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-1 hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none ${trendBorder}`}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
        <div className="md:w-5/12">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-emerald-700 group-hover:text-white">
                US$
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">Índice Dólar</p>
                  <button
                    type="button"
                    onClick={() => setHistoriaAbierta(true)}
                    aria-label="Ver la evolución del índice dólar"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-700 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 3 6-7M18 8h3v3" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-slate-500">Réplica del DXY · el dólar contra 6 monedas principales</p>
              </div>
            </div>
            {pct !== null && (
              <Badge variant={pct >= 0 ? 'positive' : 'negative'}>
                {pct >= 0 ? '+' : ''}
                {pct.toFixed(2)}%
              </Badge>
            )}
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums text-slate-900">{dxy.valor.toFixed(2)}</p>
          {estado && (
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${estado.clase}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 shrink-0" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={estado.flecha} />
              </svg>
              {estado.texto}
            </span>
          )}
          {(conNumero(dxy.variacionMesPct) || conNumero(dxy.variacionAnioPct)) && (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <Variacion etiqueta="1 mes" pct={dxy.variacionMesPct} />
              <Variacion etiqueta="12 meses" pct={dxy.variacionAnioPct} />
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">Sube cuando el dólar se fortalece frente a esas monedas.</p>
        </div>

        <div className="md:flex-1 md:border-l md:border-slate-100 md:pl-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Composición del índice</p>
          <div className="mt-2 flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
            {DXY_PESOS.map(({ codigo, peso }) => (
              <div key={codigo} className={DXY_COLORES[codigo]} style={{ width: `${peso * 100}%` }} />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs lg:grid-cols-6">
            {DXY_PESOS.map(({ codigo, peso }) => (
              <li key={codigo} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${DXY_COLORES[codigo]}`} />
                <span className="font-semibold text-slate-700">{codigo}</span>
                <span className="tabular-nums text-slate-500">{formatPeso(peso)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-snug text-slate-400">
            Calculado con la fórmula pública del DXY a partir de las cotizaciones de cierre; puede diferir levemente del valor oficial de ICE.
          </p>
        </div>
      </div>

      {historiaAbierta && (
        <HistoriaModal
          onClose={() => setHistoriaAbierta(false)}
          titulo="Índice Dólar (réplica del DXY)"
          subtitulo="El dólar contra euro, yen, libra, dólar canadiense, corona sueca y franco suizo · cierre diario"
          cargar={fetchHistoriaDxy}
          rangos={RANGOS_DXY}
          rangoInicial="1a"
          // Verde, como el ícono de la tarjeta: es el dólar.
          color="#047857"
          formatoValor={(v) => v.toFixed(2)}
          formatoEje={(v) => v.toFixed(v % 1 === 0 ? 0 : 1)}
          esMovil={esMovil}
        />
      )}
    </Card>
  )
}

export default function OtrasMonedasTab() {
  const fetcher = useCallback(() => fetchOtrasMonedas(), [])
  const { data, error, loading, refresh } = usePolling(fetcher, {
    intervalMs: 60 * 60 * 1000,
    persistKey: 'divisas_metales',
  })
  const [inverso, setInverso] = useState(false)

  // Si ya se cargó bien una vez, un error transitorio en una actualización en
  // segundo plano no debe hacer desaparecer el contenido.
  if (!data && loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    )
  }

  const monedas = (data?.cotizaciones ?? []).filter(
    (m) => MONEDAS_INFO[m.codigo] && conNumero(m.usd) && conNumero(m.ars) && conNumero(m.porUsd),
  )
  const metales = (data?.metales ?? []).filter((m) => METALES_INFO[m.codigo] && conNumero(m.usd))

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
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 shadow-md shadow-black/30">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-white">
          <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c2.2 2.4 3.5 5.5 3.5 9s-1.3 6.6-3.5 9c-2.2-2.4-3.5-5.5-3.5-9s1.3-6.6 3.5-9z" />
        </svg>
        <span className="text-sm font-bold uppercase tracking-wide text-white">Divisas Globales</span>
      </div>

      {conNumero(data?.dxy?.valor) && <TarjetaDxy dxy={data.dxy} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => setInverso(false)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                !inverso ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              style={!inverso ? { background: 'linear-gradient(135deg, #f97316 0%, #c2410c 45%, #7c2d12 100%)' } : undefined}
            >
              Moneda → $
            </button>
            <button
              type="button"
              onClick={() => setInverso(true)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                inverso ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              style={inverso ? { background: 'linear-gradient(135deg, #f97316 0%, #c2410c 45%, #7c2d12 100%)' } : undefined}
            >
              US$ → Moneda
            </button>
          </div>
          <Badge variant="info">Actualización diaria</Badge>
        </div>
        <div className="flex items-center gap-3 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 shadow-sm backdrop-blur-sm">
          {data.fecha && <span>Cierre del {formatFecha(fechaCierre(data.fecha))}</span>}
          <button type="button" onClick={refresh} className="font-semibold text-brand-300 hover:text-white hover:underline">
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {monedas.map((m, i) => {
          const info = MONEDAS_INFO[m.codigo]
          const ars = m.ars * info.unidad
          const usd = m.usd * info.unidad
          const etiqueta = info.unidad === 1 ? '1 ' + m.codigo : `${info.unidad.toLocaleString('es-AR')} ${m.codigo}`
          const pct = numeroONull(inverso ? m.variacionPctInverso : m.variacionPct)
          const trendBorder = pct === null ? '!border-t-slate-200' : pct >= 0 ? '!border-t-emerald-700' : '!border-t-rose-700'
          return (
            <Card
              key={m.codigo}
              className={`group animate-fade-up border-t-4 p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none ${trendBorder}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all duration-300 ease-out group-hover:scale-110 ${info.icon}`}>
                    {info.simbolo}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{info.nombre}</p>
                    <p className="text-xs text-slate-500">{inverso ? `US$ → ${m.codigo}` : `Cada ${etiqueta}`}</p>
                  </div>
                </div>
                {pct !== null && (
                  <Badge variant={pct >= 0 ? 'positive' : 'negative'}>
                    {pct >= 0 ? '+' : ''}
                    {pct.toFixed(2)}%
                  </Badge>
                )}
              </div>
              {inverso ? (
                <div className="mt-4">
                  <p className="text-xs text-slate-500">1 dólar estadounidense equivale a</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {m.porUsd.toFixed(info.decimalesInverso)} {info.simbolo}
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500">En pesos</p>
                    <p className="text-lg font-bold text-slate-900">{formatArs(ars)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">En dólares</p>
                    <p className="text-lg font-bold text-slate-900">{formatUsd(usd, info.decimalesUsd)}</p>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <div className="mb-5 mt-8 inline-flex items-center gap-2 rounded-full bg-[#dba61f] px-4 py-2 shadow-md shadow-black/30">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-slate-900">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 18h14l-2-9H7l-2 9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l1.3-2h5.4l1.3 2" />
        </svg>
        <span className="text-sm font-bold uppercase tracking-wide text-slate-900">Metales</span>
      </div>

      {/* Si la fuente dejó de publicar alguno, las que quedan ocupan el ancho entre
          ellas en vez de dejar un hueco vacío en la fila. */}
      <div className={`grid grid-cols-1 gap-4 ${metales.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {metales.map((m, i) => {
          const info = METALES_INFO[m.codigo]
          const pct = numeroONull(m.variacionPct)
          const trendBorder = pct === null ? '!border-t-slate-200' : pct >= 0 ? '!border-t-emerald-700' : '!border-t-rose-700'
          return (
            <Card
              key={m.codigo}
              className={`group animate-fade-up border-t-4 p-5 shadow-md shadow-slate-200/70 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.5)] motion-reduce:transition-none motion-reduce:animate-none ${trendBorder}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all duration-300 ease-out group-hover:scale-110 ${info.icon}`}>
                    {info.simbolo}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{info.nombre}</p>
                    <p className="text-xs text-slate-500">Metal precioso</p>
                  </div>
                </div>
                {pct !== null && (
                  <Badge variant={pct >= 0 ? 'positive' : 'negative'}>
                    {pct >= 0 ? '+' : ''}
                    {pct.toFixed(2)}%
                  </Badge>
                )}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-500">Por gramo</p>
                  <p className="text-lg font-bold text-slate-900">{formatUsd(m.usd / GRAMOS_POR_ONZA_TROY, 2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Por onza</p>
                  <p className="text-lg font-bold text-slate-900">{formatUsd(m.usd, 2)}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-900/20 px-4 py-3 ring-1 ring-inset ring-white/15">
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
          Valores de referencia actualizados diariamente con fines informativos. No constituyen una
          recomendación operativa ni sustituyen la cotización de liquidación provista por cada
          entidad bancaria.
        </p>
      </div>
    </div>
  )
}
