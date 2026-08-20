import { useMemo, useState } from 'react'
import Card from '../ui/Card'
import { sensibilidadPrecio } from '../../utils/bondMath'

const PASOS_BP = [-200, -100, -50, 50, 100, 200]

export default function RiesgoPaisSensitivity({ riesgoPais, globales, bonares }) {
  const bonos = [...globales, ...bonares]
  const [tickerSeleccionado, setTickerSeleccionado] = useState(bonos[0]?.ticker)
  const [deltaBp, setDeltaBp] = useState(100)

  const bono = bonos.find((b) => b.ticker === tickerSeleccionado) ?? bonos[0]

  const impacto = useMemo(
    () =>
      bono ? sensibilidadPrecio({ duracionAnios: bono.duracionAnios, deltaPuntosBasicos: deltaBp }) : 0,
    [bono, deltaBp],
  )

  if (!bono) return null

  const precioEstimado = bono.precio * (1 + impacto)
  const riesgoPaisEstimado = riesgoPais.valor + deltaBp

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-slate-900">Impacto por Variación de Spread Soberano</h3>
      <p className="mt-1 text-sm text-slate-500">
        Estimación del impacto teórico en la cotización ante variaciones en la tasa de rendimiento exigida.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-500">Bono</label>
          <select
            value={tickerSeleccionado}
            onChange={(e) => setTickerSeleccionado(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <optgroup label="Globales (Ley NY)">
              {globales.map((b) => (
                <option key={b.ticker} value={b.ticker}>
                  {b.ticker} · USD {b.precio.toFixed(1)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Bonares (Ley Arg)">
              {bonares.map((b) => (
                <option key={b.ticker} value={b.ticker}>
                  {b.ticker} · USD {b.precio.toFixed(1)}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">
            Variación de riesgo país: {deltaBp > 0 ? '+' : ''}
            {deltaBp} pb
          </label>
          <input
            type="range"
            min="-300"
            max="300"
            step="10"
            value={deltaBp}
            onChange={(e) => setDeltaBp(Number(e.target.value))}
            className="mt-3 w-full accent-brand-600"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {PASOS_BP.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDeltaBp(p)}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                {p > 0 ? '+' : ''}
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-brand-700 p-4">
          <p className="text-xs text-white/70">Riesgo país simulado</p>
          <p className="text-xl font-bold text-white">{riesgoPaisEstimado} pb</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Impacto estimado en precio</p>
          <p className={`text-xl font-bold ${impacto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {impacto >= 0 ? '+' : ''}
            {(impacto * 100).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl bg-orange-400 p-4">
          <p className="text-xs text-slate-900/70">Precio estimado {bono.ticker}</p>
          <p className="text-xl font-bold text-slate-900">USD {precioEstimado.toFixed(1)}</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Estimación simplificada (duración: {bono.duracionAnios} años) que asume que el riesgo país se
        traslada 1 a 1 al rendimiento exigido. El precio real también depende de la curva de tasas,
        liquidez y otros factores de mercado.
      </p>
    </Card>
  )
}
