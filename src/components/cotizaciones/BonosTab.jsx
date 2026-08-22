import { useCallback, useState } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { fetchDolares } from '../../services/dolaresApi'
import { fetchRentaFija } from '../../services/rentaFijaApi'
import { fetchUniversoBonos } from '../../services/bondsLiveApi'
import Card from '../ui/Card'
import RiesgoPaisCard from './RiesgoPaisCard'
import ReservasCard from './ReservasCard'
import TasasReferenciaCard from './TasasReferenciaCard'
import BreakevenCalculator from './BreakevenCalculator'
import RiesgoPaisSensitivity from './RiesgoPaisSensitivity'
import BondsUniverse from './BondsUniverse'

export default function BonosTab() {
  const rentaFijaFetcher = useCallback(() => fetchRentaFija(), [])
  const dolaresFetcher = useCallback(() => fetchDolares(), [])
  const universoFetcher = useCallback(() => fetchUniversoBonos(), [])

  const rentaFija = usePolling(rentaFijaFetcher, { intervalMs: 120000 })
  const dolares = usePolling(dolaresFetcher, { intervalMs: 60000 })
  const universo = usePolling(universoFetcher, { intervalMs: 60000 })

  const [modelosAbierto, setModelosAbierto] = useState(false)

  const loading = rentaFija.loading || dolares.loading || universo.loading
  const error = rentaFija.error || dolares.error || universo.error

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-rose-600">{error}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <RiesgoPaisCard riesgoPais={rentaFija.data.riesgoPais} />
          <ReservasCard />
        </div>
        <TasasReferenciaCard />
      </div>

      <BondsUniverse
        globales={universo.data.globales}
        bonares={universo.data.bonares}
        duales={universo.data.duales}
        letras={rentaFija.data.letras}
      />

      <div>
        <button
          type="button"
          onClick={() => setModelosAbierto((v) => !v)}
          aria-expanded={modelosAbierto}
          className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left shadow-sm shadow-slate-200/50 transition-colors hover:bg-slate-100"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-brand-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 3h6a1 1 0 011 1v2H8V4a1 1 0 011-1zM8 6h8v14a1 1 0 01-1 1H9a1 1 0 01-1-1V6zM9 10h6M9 13h6M9 16h3"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Modelos y Análisis</p>
              <p className="text-xs text-slate-500">
                Breakeven cambiario y sensibilidad de bonos al spread soberano
              </p>
            </div>
          </div>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${modelosAbierto ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {modelosAbierto && (
          <div className="mt-6 space-y-6">
            <BreakevenCalculator letras={rentaFija.data.letras} dolares={dolares.data} />
            <RiesgoPaisSensitivity
              riesgoPais={rentaFija.data.riesgoPais}
              globales={universo.data.globales}
              bonares={universo.data.bonares}
            />
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-black/30 px-4 py-3 ring-1 ring-inset ring-white/10">
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
          Valores e indicadores provistos con fines exclusivamente analíticos y educativos. Los
          cálculos teóricos y cotizaciones de referencia no constituyen oferta pública ni
          recomendación de inversión.
        </p>
      </div>
    </div>
  )
}
