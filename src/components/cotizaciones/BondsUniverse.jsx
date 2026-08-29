import { useState } from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import FlashPrice from '../ui/FlashPrice'

// timeZone: 'UTC' evita que una fecha sin hora (ej. "2029-07-09") se corra un día
// para atrás al mostrarla en un huso horario negativo como Argentina (UTC-3).
const formatDate = (value) => new Date(value).toLocaleDateString('es-AR', { timeZone: 'UTC' })
const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)

const ROW_CLASS =
  'group animate-fade-up border-l-4 border-transparent transition-colors duration-200 hover:border-brand-500 hover:bg-brand-50/60 motion-reduce:animate-none'
const TICKER_CLASS =
  'px-5 py-3 font-semibold text-brand-600 transition-colors duration-200 group-hover:text-brand-800'
const HEAD_CLASS = 'border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600'
const rowDelay = (i) => ({ animationDelay: `${i * 40}ms` })

const GRUPOS = [
  { id: 'globales', label: 'Globales' },
  { id: 'bonares', label: 'Bonares' },
  { id: 'letras', label: 'Lecap' },
  { id: 'lecer', label: 'Lecer' },
  { id: 'duales', label: 'Duales' },
  { id: 'boncap', label: 'Boncap' },
]

function VarBadge({ value }) {
  if (typeof value !== 'number') return <span className="text-slate-400">—</span>
  // Sin variación real (recién pasada la medianoche, antes de que el mercado vuelva a
  // operar, ver obtenerAperturaDiaria) debe verse neutro, no "positivo" en verde.
  if (Math.abs(value) < 0.005) return <Badge variant="neutral">0.00%</Badge>
  return (
    <Badge variant={value >= 0 ? 'positive' : 'negative'}>
      {value >= 0 ? '+' : ''}
      {value.toFixed(2)}%
    </Badge>
  )
}

function TablaUsd({ bonos }) {
  return (
    <table className="w-full min-w-[420px] text-left text-sm">
      <thead className={HEAD_CLASS}>
        <tr>
          <th className="px-5 py-3 font-medium">Ticker</th>
          <th className="px-5 py-3 font-medium">Ley</th>
          <th className="px-5 py-3 font-medium text-right">Precio</th>
          <th className="px-5 py-3 font-medium text-right">Var.</th>
          <th className="px-5 py-3 font-medium text-right">Vencimiento</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {bonos.map((b, i) => (
          <tr key={b.ticker} className={ROW_CLASS} style={rowDelay(i)}>
            <td className={TICKER_CLASS}>{b.ticker}</td>
            <td className="px-5 py-3 text-slate-500">{b.ley}</td>
            <td className="px-5 py-3 text-right">
              <FlashPrice value={b.precio} formatted={`USD ${b.precio.toFixed(2)}`} className="font-semibold" />
            </td>
            <td className="px-5 py-3 text-right">
              <VarBadge value={b.variacionPorcentaje} />
            </td>
            <td className="px-5 py-3 text-right text-slate-500">{formatDate(b.vencimiento)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TablaLetras({ letras }) {
  return (
    <table className="w-full min-w-[420px] text-left text-sm">
      <thead className={HEAD_CLASS}>
        <tr>
          <th className="px-5 py-3 font-medium">Ticker</th>
          <th className="px-5 py-3 font-medium">Ley</th>
          <th className="px-5 py-3 font-medium text-right">Precio</th>
          <th className="px-5 py-3 font-medium text-right">Var.</th>
          <th className="px-5 py-3 font-medium text-right">Vencimiento</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {letras.map((l, i) => (
          <tr key={l.ticker} className={ROW_CLASS} style={rowDelay(i)}>
            <td className={TICKER_CLASS}>{l.ticker}</td>
            <td className="px-5 py-3 text-slate-500">ARG</td>
            <td className="px-5 py-3 text-right">
              <FlashPrice value={l.precioActual} formatted={formatArs(l.precioActual)} className="font-semibold" />
            </td>
            <td className="px-5 py-3 text-right">
              <VarBadge value={l.variacionPorcentaje} />
            </td>
            <td className="px-5 py-3 text-right text-slate-500">{formatDate(l.fechaVencimiento)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TablaDuales({ bonos }) {
  return (
    <table className="w-full min-w-[420px] text-left text-sm">
      <thead className={HEAD_CLASS}>
        <tr>
          <th className="px-5 py-3 font-medium">Ticker</th>
          <th className="px-5 py-3 font-medium">Ley</th>
          <th className="px-5 py-3 font-medium text-right">Precio</th>
          <th className="px-5 py-3 font-medium text-right">Var.</th>
          <th className="px-5 py-3 font-medium text-right">Vencimiento</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {bonos.map((b, i) => (
          <tr key={b.ticker} className={ROW_CLASS} style={rowDelay(i)}>
            <td className={TICKER_CLASS}>{b.ticker}</td>
            <td className="px-5 py-3 text-slate-500">ARG</td>
            <td className="px-5 py-3 text-right">
              <FlashPrice value={b.precio} formatted={formatArs(b.precio)} className="font-semibold" />
            </td>
            <td className="px-5 py-3 text-right">
              <VarBadge value={b.variacionPorcentaje} />
            </td>
            <td className="px-5 py-3 text-right text-slate-500">{formatDate(b.vencimiento)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function BondsUniverse({ globales, bonares, duales, letras, lecer, boncap, onActualizar }) {
  const [grupo, setGrupo] = useState('globales')

  return (
    <Card
      className="group/card animate-fade-up overflow-hidden border-t-4 !border-t-brand-200 transition-colors duration-300 hover:!border-t-brand-600"
      style={{ animationDelay: '320ms' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-all duration-300 ease-out group-hover/card:scale-110 group-hover/card:bg-brand-600 group-hover/card:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V13M11 21V8M16 21V11" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900">Renta Fija Soberana</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
            <span>Actualización cada 5 min</span>
            {onActualizar && (
              <button type="button" onClick={onActualizar} className="font-semibold text-brand-600 hover:underline">
                Actualizar ahora
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 p-6 pb-4">
        {GRUPOS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGrupo(g.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              grupo === g.id ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto pb-6">
        {grupo === 'globales' && <TablaUsd key="globales" bonos={globales} />}
        {grupo === 'bonares' && <TablaUsd key="bonares" bonos={bonares} />}
        {grupo === 'letras' && <TablaLetras key="letras" letras={letras} />}
        {grupo === 'duales' && <TablaDuales key="duales" bonos={duales} />}
        {grupo === 'lecer' && <TablaLetras key="lecer" letras={lecer} />}
        {grupo === 'boncap' && <TablaDuales key="boncap" bonos={boncap} />}
      </div>

      {grupo === 'duales' && (
        <p className="px-6 pb-6 -mt-4 text-xs text-slate-400">
          Los duales pagan lo mayor entre una tasa fija y una tasa ligada a devaluación + spread;
          el precio de mercado ya refleja esa opcionalidad.
        </p>
      )}
    </Card>
  )
}
