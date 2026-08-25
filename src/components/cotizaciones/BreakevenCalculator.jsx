import { useEffect, useMemo, useState } from 'react'
import Card from '../ui/Card'
import { retornoLetra, calcularBreakeven } from '../../utils/bondMath'

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
const formatPctSigned = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
// timeZone: 'UTC' evita que una fecha sin hora se corra un día para atrás al
// mostrarla en un huso horario negativo como Argentina (UTC-3).
const formatDate = (value) => new Date(value).toLocaleDateString('es-AR', { timeZone: 'UTC' })

const CHIPS = [-1, -0.5, -0.25, 0.25, 0.5, 1]

// Umbrales de margen sobre la devaluación máxima tolerada: por debajo de 0%
// el breakeven ya quedó corto del spread inicial (carry perdedor); entre 0%
// y 5% el margen es ajustado; por encima, holgado.
function margenInfo(devaluacionMax) {
  if (devaluacionMax === null) return { color: 'text-slate-900', chip: 'bg-slate-100 text-slate-600', label: '—' }
  if (devaluacionMax < 0) return { color: 'text-rose-600', chip: 'bg-rose-100 text-rose-700', label: 'Margen negativo' }
  if (devaluacionMax < 5) return { color: 'text-amber-600', chip: 'bg-amber-100 text-amber-700', label: 'Margen ajustado' }
  return { color: 'text-emerald-600', chip: 'bg-emerald-100 text-emerald-700', label: 'Margen holgado' }
}

export default function BreakevenCalculator({ letras, dolares }) {
  const opciones = useMemo(
    () => letras.map((l) => ({ id: `letra-${l.ticker}`, ticker: l.ticker, data: l })),
    [letras],
  )

  const [selectedId, setSelectedId] = useState(opciones[0]?.id)
  const seleccionado = opciones.find((o) => o.id === selectedId) ?? opciones[0]

  const dolarOficial = dolares.find((d) => d.casa === 'oficial') ?? dolares[0]
  const [tcComp, setTcComp] = useState(() => dolarOficial?.compra ?? 0)
  const [tcVend0, setTcVend0] = useState(() => dolarOficial?.venta ?? 0)
  const [rPct, setRPct] = useState(0)

  // Al cambiar de letra, la TEM del período (r) y el plazo (t) se reconfiguran
  // por defecto según el instrumento elegido.
  useEffect(() => {
    if (!seleccionado) return
    const { retornoTotal } = retornoLetra(seleccionado.data)
    setRPct(Number((retornoTotal * 100).toFixed(2)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  if (!seleccionado) return null

  const { dias } = retornoLetra(seleccionado.data)
  const r = rPct / 100

  const { dolarBreakeven: tcBreakeven } = calcularBreakeven({ retornoTotal: r, dolarSpot: tcComp })
  const arsT = tcComp * (1 + r)
  const devaluacionMax = tcVend0 > 0 ? ((tcBreakeven - tcVend0) / tcVend0) * 100 : null
  const margen = margenInfo(devaluacionMax)

  const ajustar = (delta) => setRPct((v) => Number((v + delta).toFixed(2)))

  return (
    <Card className="group p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <rect x="5" y="3" width="14" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01M16 17h.01"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Breakeven Carry Trade (USD vs. Pesos)</h3>
          <p className="text-sm text-slate-500">
            Estimación del tipo de cambio vendedor de equilibrio y tolerancia a la devaluación
            considerando el spread cambiario inicial.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Letra</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {opciones.map((o) => (
              <option key={o.id} value={o.id}>
                {o.ticker} · vto. {formatDate(o.data.fechaVencimiento)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">Plazo: {dias} días</p>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">TC comprador inicial</label>
          <input
            type="number"
            step="0.01"
            value={tcComp}
            onChange={(e) => setTcComp(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-slate-400">Tipo de cambio al liquidar los USD para entrar al carry.</p>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">TC vendedor inicial</label>
          <input
            type="number"
            step="0.01"
            value={tcVend0}
            onChange={(e) => setTcVend0(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-slate-400">Referencia del dólar de compra en t₀.</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-slate-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-medium text-slate-500">Tasa efectiva del período (TEM)</label>
          <span className="text-sm font-bold text-slate-900">{rPct.toFixed(2)}%</span>
        </div>
        <input
          type="range"
          min={-10}
          max={50}
          step={0.05}
          value={rPct}
          onChange={(e) => setRPct(Number(e.target.value))}
          className="mt-2 w-full accent-brand-600"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CHIPS.map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => ajustar(delta)}
              className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-brand-500 hover:text-brand-600"
            >
              {delta > 0 ? '+' : ''}
              {delta.toFixed(2)}%
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-xs text-slate-500">Pesos por USD al vencimiento</p>
          <p className="text-xl font-bold text-slate-900">{formatArs(arsT)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-inset ring-slate-200">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Devaluación máx. tolerada</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${margen.chip}`}>
              {margen.label}
            </span>
          </div>
          <p className={`text-xl font-bold ${margen.color}`}>
            {devaluacionMax === null ? '—' : formatPctSigned(devaluacionMax)}
          </p>
        </div>
        <div className="rounded-xl bg-orange-400 p-4">
          <p className="text-xs text-slate-900/70">TC breakeven vendedor</p>
          <p className="text-xl font-bold text-slate-900">{formatArs(tcBreakeven)}</p>
          <p className="mt-1 text-[11px] text-slate-900/60">
            Cotización máxima de recompra en t{'ₜ'} para no perder capital en USD.
          </p>
        </div>
      </div>
    </Card>
  )
}
