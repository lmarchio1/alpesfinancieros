import { useMemo, useState } from 'react'
import Card from '../ui/Card'
import { retornoLetra, retornoBoncerNominal, calcularBreakeven, anualizar } from '../../utils/bondMath'

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

export default function BreakevenCalculator({ letras, bonos, dolares }) {
  const opciones = useMemo(
    () => [
      ...letras.map((l) => ({ id: `letra-${l.ticker}`, tipo: 'letra', ticker: l.ticker, data: l })),
      ...bonos.map((b) => ({ id: `boncer-${b.ticker}`, tipo: 'boncer', ticker: b.ticker, data: b })),
    ],
    [letras, bonos],
  )

  const [selectedId, setSelectedId] = useState(opciones[0]?.id)
  const [inflacionEsperada, setInflacionEsperada] = useState(25)
  const [dolarTipo, setDolarTipo] = useState('blue')

  const seleccionado = opciones.find((o) => o.id === selectedId) ?? opciones[0]
  const dolarSeleccionado = dolares.find((d) => d.casa === dolarTipo) ?? dolares[0]

  const resultado = useMemo(() => {
    if (!seleccionado || !dolarSeleccionado) return null

    const { retornoTotal, dias } =
      seleccionado.tipo === 'letra'
        ? retornoLetra(seleccionado.data)
        : retornoBoncerNominal(seleccionado.data, inflacionEsperada / 100)

    const dolarSpot = dolarSeleccionado.venta
    const { dolarBreakeven, devaluacionImplicitaTotal } = calcularBreakeven({ retornoTotal, dolarSpot })

    return {
      dias,
      retornoTotal,
      retornoAnualizado: anualizar(retornoTotal, dias),
      dolarSpot,
      dolarBreakeven,
      devaluacionImplicitaTotal,
      devaluacionAnualizada: anualizar(devaluacionImplicitaTotal, dias),
    }
  }, [seleccionado, dolarSeleccionado, inflacionEsperada])

  if (!seleccionado || !dolarSeleccionado) return null

  const vencimiento = seleccionado.data.fechaVencimiento

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-slate-900">Análisis de Breakeven Cambiario</h3>
      <p className="mt-1 text-sm text-slate-500">
        Evaluación del tipo de cambio implícito de indiferencia frente a instrumentos en moneda local.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Instrumento</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <optgroup label="Letras (LECAPs)">
              {opciones
                .filter((o) => o.tipo === 'letra')
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.ticker} · vto. {formatDate(o.data.fechaVencimiento)}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Boncer (CER)">
              {opciones
                .filter((o) => o.tipo === 'boncer')
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.ticker} · vto. {formatDate(o.data.fechaVencimiento)}
                  </option>
                ))}
            </optgroup>
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

        {seleccionado.tipo === 'boncer' && (
          <div>
            <label className="text-xs font-medium text-slate-500">Inflación anual esperada</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="200"
                value={inflacionEsperada}
                onChange={(e) => setInflacionEsperada(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </div>
        )}
      </div>

      {resultado && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-xs text-slate-500">Devaluación implícita</p>
              <p className="text-xl font-bold text-slate-900">{formatPct(resultado.devaluacionImplicitaTotal)}</p>
              <p className="text-xs text-slate-400">{formatPct(resultado.devaluacionAnualizada)} anualizada</p>
            </div>
          </div>

          <p className="mt-5 rounded-lg bg-brand-50 p-4 text-sm text-slate-700">
            Para cotizaciones de dólar {DOLAR_LABELS[dolarTipo].toLowerCase()} por debajo de{' '}
            <strong>{formatArs(resultado.dolarBreakeven)}</strong>, el instrumento en pesos ({seleccionado.ticker}
            ) ofrece mayor rendimiento efectivo. Por encima de dicho valor, el posicionamiento en moneda
            extranjera resulta superior.
          </p>
          {seleccionado.tipo === 'boncer' && (
            <p className="mt-2 text-xs text-slate-400">
              El retorno de Boncer depende de la inflación futura (CER): el resultado usa el supuesto de
              inflación esperada que definiste arriba, no un dato en vivo.
            </p>
          )}
        </>
      )}
    </Card>
  )
}
