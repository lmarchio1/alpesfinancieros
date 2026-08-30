import { useCallback, useRef, useState } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { fetchDolares } from '../../services/dolaresApi'
import { fetchRentaFija } from '../../services/rentaFijaApi'
import { fetchUniversoBonos } from '../../services/bondsLiveApi'
import Card from '../ui/Card'
import RiesgoPaisCard from './RiesgoPaisCard'
import ReservasCard from './ReservasCard'
import BadlarCard from './BadlarCard'
import TamarCard from './TamarCard'
import DolarEsperadoCard from './DolarEsperadoCard'
import BreakevenCalculator from './BreakevenCalculator'
import RiesgoPaisSensitivity from './RiesgoPaisSensitivity'
import BondsUniverse from './BondsUniverse'

export default function BonosTab() {
  // Los precios de bonos/letras se sirven desde una cache en Supabase (actualizada
  // cada 5 min por un GitHub Action) para que la pestaña cargue más rápido. El botón
  // "Actualizar ahora" fuerza puntualmente saltear esa cache y pedirle el dato
  // directo a data912 -sin tocar el intervalo de 5 min para el resto de los
  // visitantes-.
  const forzarRef = useRef(false)
  const rentaFijaFetcher = useCallback(() => fetchRentaFija(forzarRef.current), [])
  const dolaresFetcher = useCallback(() => fetchDolares(), [])
  const universoFetcher = useCallback(() => fetchUniversoBonos(forzarRef.current), [])

  const rentaFija = usePolling(rentaFijaFetcher, { intervalMs: 120000, persistKey: 'renta_fija' })
  // Mismo persistKey que DolaresTab.jsx: es el mismo fetchDolares(), comparten cache.
  const dolares = usePolling(dolaresFetcher, { intervalMs: 60000, persistKey: 'dolares' })
  const universo = usePolling(universoFetcher, { intervalMs: 60000, persistKey: 'universo_bonos' })

  const actualizarAhora = () => {
    forzarRef.current = true
    Promise.all([rentaFija.refresh(), universo.refresh()]).finally(() => {
      forzarRef.current = false
    })
  }

  const [modelosAbierto, setModelosAbierto] = useState(false)

  const loading = rentaFija.loading || dolares.loading || universo.loading
  const error = rentaFija.error || dolares.error || universo.error
  const hasData = Boolean(rentaFija.data && dolares.data && universo.data)

  // Si ya se cargó bien una vez, un error transitorio en una actualización en
  // segundo plano no debe hacer desaparecer el contenido: se sigue mostrando
  // lo último bueno en vez de reemplazarlo por la pantalla de error.
  if (!hasData && loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  if (!hasData && error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-rose-600">{error}</p>
      </Card>
    )
  }

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RiesgoPaisCard riesgoPais={rentaFija.data.riesgoPais} />
        <ReservasCard />
        <BadlarCard />
        <TamarCard />
      </div>

      <BondsUniverse
        globales={universo.data.globales}
        bonares={universo.data.bonares}
        duales={universo.data.duales}
        letras={rentaFija.data.letras}
        lecer={rentaFija.data.lecer}
        boncap={universo.data.boncap}
        dolarLinked={universo.data.dolarLinked}
        tamar={universo.data.tamar}
        bopreal={universo.data.bopreal}
        boncer={universo.data.boncer}
        onActualizar={actualizarAhora}
      />

      <div className="animate-fade-up" style={{ animationDelay: '400ms' }}>
        <button
          type="button"
          onClick={() => setModelosAbierto((v) => !v)}
          aria-expanded={modelosAbierto}
          className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-brand-50 p-6 text-left shadow-sm shadow-slate-200/50 transition-colors hover:bg-brand-100"
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
            <DolarEsperadoCard />
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
