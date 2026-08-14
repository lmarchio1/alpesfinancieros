import { useState } from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'

const formatDate = (value) => new Date(value).toLocaleDateString('es-AR')
const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)

const ROW_CLASS =
  'group animate-fade-up border-l-4 border-transparent transition-colors duration-200 hover:border-brand-500 hover:bg-brand-50/60 motion-reduce:animate-none'
const TICKER_CLASS =
  'px-5 py-3 font-semibold text-brand-600 transition-colors duration-200 group-hover:text-brand-800'
const rowDelay = (i) => ({ animationDelay: `${i * 40}ms` })

const GRUPOS = [
  { id: 'globales', label: 'Globales' },
  { id: 'bonares', label: 'Bonares' },
  { id: 'boncer', label: 'Boncer' },
  { id: 'letras', label: 'Letras' },
  { id: 'duales', label: 'Duales' },
]

function VarBadge({ value }) {
  if (typeof value !== 'number') return <span className="text-slate-400">—</span>
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
      <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
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
            <td className="px-5 py-3 text-right font-semibold text-slate-900">USD {b.precio.toFixed(2)}</td>
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

function TablaBoncer({ bonos }) {
  return (
    <table className="w-full min-w-[420px] text-left text-sm">
      <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-5 py-3 font-medium">Ticker</th>
          <th className="px-5 py-3 font-medium">Ley</th>
          <th className="px-5 py-3 font-medium text-right">Precio</th>
          <th className="px-5 py-3 font-medium text-right">TIR</th>
          <th className="px-5 py-3 font-medium text-right">Vencimiento</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {bonos.map((b, i) => (
          <tr key={b.ticker} className={ROW_CLASS} style={rowDelay(i)}>
            <td className={TICKER_CLASS}>{b.ticker}</td>
            <td className="px-5 py-3 text-slate-500">ARG</td>
            <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatArs(b.precioArs)}</td>
            <td className="px-5 py-3 text-right">
              <Badge variant="brand">{b.tirPorcentaje}%</Badge>
            </td>
            <td className="px-5 py-3 text-right text-slate-500">{formatDate(b.fechaVencimiento)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TablaLetras({ letras }) {
  return (
    <table className="w-full min-w-[420px] text-left text-sm">
      <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
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
            <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatArs(l.precioActual)}</td>
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
      <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
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
            <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatArs(b.precio)}</td>
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

export default function BondsUniverse({ globales, bonares, duales, boncer, letras }) {
  const [grupo, setGrupo] = useState('globales')

  const fuente = grupo === 'boncer' ? 'argentinadatos.com' : grupo === 'letras' ? 'data912.com' : 'data912.com'

  return (
    <Card className="overflow-hidden border-t-4 border-[#c17a1e]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fbeed6] text-[#c17a1e]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 21h18M4 10v11M20 10v11M2 10l10-6 10 6M8 10v11M16 10v11"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900">Universo de bonos</h3>
        </div>
        <Badge variant="positive">● En vivo · {fuente}</Badge>
      </div>

      <div className="flex flex-wrap gap-1 p-6 pb-4">
        {GRUPOS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGrupo(g.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              grupo === g.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        {grupo === 'globales' && <TablaUsd key="globales" bonos={globales} />}
        {grupo === 'bonares' && <TablaUsd key="bonares" bonos={bonares} />}
        {grupo === 'boncer' && <TablaBoncer key="boncer" bonos={boncer} />}
        {grupo === 'letras' && <TablaLetras key="letras" letras={letras} />}
        {grupo === 'duales' && <TablaDuales key="duales" bonos={duales} />}
      </div>

      {grupo === 'duales' && (
        <p className="px-6 pb-6 pt-2 text-xs text-slate-400">
          Los duales pagan lo mayor entre una tasa fija y una tasa ligada a devaluación + spread;
          el precio de mercado ya refleja esa opcionalidad.
        </p>
      )}
    </Card>
  )
}
