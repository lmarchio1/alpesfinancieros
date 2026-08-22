import { useMemo, useState } from 'react'
import Card from '../ui/Card'
import { retornoLetra, calcularBreakeven, anualizar } from '../../utils/bondMath'

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
const formatPct = (value) => `${(value * 100).toFixed(1)}%`
// timeZone: 'UTC' evita que una fecha sin hora se corra un día para atrás al
// mostrarla en un huso horario negativo como Argentina (UTC-3).
const formatDate = (value) => new Date(value).toLocaleDateString('es-AR', { timeZone: 'UTC' })

const DOLAR_LABELS = {
  oficial: 'Oficial',
  blue: 'Blue',
  bolsa: 'MEP (bolsa)',
  contadoconliqui: 'CCL',
  mayorista: 'Mayorista',
  cripto: 'Cripto',
  tarjeta: 'Tarjeta',
}

export default function BreakevenCalculator({ letras, dolares }) {
  const opciones = useMemo(
    () => letras.map((l) => ({ id: `letra-${l.ticker}`, ticker: l.ticker, data: l })),
    [letras],
  )

  const [selectedId, setSelectedId] = useState(opciones[0]?.id)
  const [dolarTipo, setDolarTipo] = useState('blue')

  const seleccionado = opciones.find((o) => o.id === selectedId) ?? opciones[0]
  const dolarSeleccionado = dolares.find((d) => d.casa === dolarTipo) ?? dolares[0]

  const resultado = useMemo(() => {
    if (!seleccionado || !dolarSeleccionado) return null

    const { retornoTotal, dias } = retornoLetra(seleccionado.data)

    const dolarSpot = dolarSeleccionado.venta
    const { dolarBreakeven } = calcularBreakeven({ retornoTotal, dolarSpot })

    return {
      dias,
      retornoTotal,
      retornoAnualizado: anualizar(retornoTotal, dias),
      dolarSpot,
      dolarBreakeven,
    }
  }, [seleccionado, dolarSeleccionado])

  if (!seleccionado || !dolarSeleccionado) return null

  const vencimiento = seleccionado.data.fechaVencimiento

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
          <h3 className="font-semibold text-slate-900">Análisis de Breakeven Cambiario</h3>
          <p className="text-sm text-slate-500">
            Evaluación del tipo de cambio implícito de indiferencia frente a instrumentos en moneda local.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-500">Instrumento</label>
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
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">Dólar de referencia</label>
          <select
            value={dolarTipo}
            onChange={(e) => setDolarTipo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {dolares.map((d) => (
              <option key={d.casa} value={d.casa}>
                {DOLAR_LABELS[d.casa] ?? d.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {resultado && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-xs text-slate-500">Retorno en pesos ({resultado.dias} días)</p>
              <p className="text-xl font-bold text-slate-900">{formatPct(resultado.retornoTotal)}</p>
              <p className="text-xs text-slate-400">{formatPct(resultado.retornoAnualizado)} anualizado</p>
            </div>
            <div className="rounded-xl bg-brand-700 p-4">
              <p className="text-xs text-white/70">Dólar {DOLAR_LABELS[dolarTipo]} hoy</p>
              <p className="text-xl font-bold text-white">{formatArs(resultado.dolarSpot)}</p>
            </div>
            <div className="rounded-xl bg-orange-400 p-4">
              <p className="text-xs text-slate-900/70">Dólar breakeven al vencimiento</p>
              <p className="text-xl font-bold text-slate-900">{formatArs(resultado.dolarBreakeven)}</p>
            </div>
          </div>

          <p className="mt-5 rounded-lg bg-brand-50 p-4 text-sm text-slate-700">
            Para cotizaciones de dólar {DOLAR_LABELS[dolarTipo].toLowerCase()} por debajo de{' '}
            <strong>{formatArs(resultado.dolarBreakeven)}</strong>, el instrumento en pesos ({seleccionado.ticker}
            ) ofrece mayor rendimiento efectivo. Por encima de dicho valor, el posicionamiento en moneda
            extranjera resulta superior.
          </p>
        </>
      )}
    </Card>
  )
}
