import { useCallback } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { fetchDolares } from '../../services/dolaresApi'
import { fetchRentaFija } from '../../services/rentaFijaApi'
import { fetchUniversoBonos } from '../../services/bondsLiveApi'
import Card from '../ui/Card'
import RiesgoPaisCard from './RiesgoPaisCard'
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
      <RiesgoPaisCard riesgoPais={rentaFija.data.riesgoPais} />
      <BreakevenCalculator letras={rentaFija.data.letras} bonos={rentaFija.data.bonos} dolares={dolares.data} />
      <RiesgoPaisSensitivity
        riesgoPais={rentaFija.data.riesgoPais}
        globales={universo.data.globales}
        bonares={universo.data.bonares}
      />
      <BondsUniverse
        globales={universo.data.globales}
        bonares={universo.data.bonares}
        duales={universo.data.duales}
        boncer={rentaFija.data.bonos}
        letras={rentaFija.data.letras}
      />
    </div>
  )
}
