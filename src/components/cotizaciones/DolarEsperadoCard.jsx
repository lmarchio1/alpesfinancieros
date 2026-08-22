import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import { fetchDolarEsperadoREM } from '../../services/remApi'

const formatArs = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const formatMesCorto = (periodoDesde) => {
  const d = new Date(`${periodoDesde}T00:00:00Z`)
  return `${MESES_CORTOS[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`
}

export default function DolarEsperadoCard() {
  const [rem, setRem] = useState(null)
  useEffect(() => {
    fetchDolarEsperadoREM()
      .then(setRem)
      .catch(() => setRem(null))
  }, [])

  if (!rem) return null

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-slate-900">Dólar Esperado (REM)</h3>
      <p className="mt-1 text-sm text-slate-500">
        Mediana de pronósticos de bancos y consultoras relevados por el BCRA para el tipo de cambio
        nominal, mes a mes.
      </p>

      <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
        {rem.meses.map((m) => (
          <div key={m.periodoDesde} className="min-w-[92px] shrink-0 rounded-xl bg-slate-100 p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {formatMesCorto(m.periodoDesde)}
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatArs(m.mediana)}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Relevamiento de Expectativas de Mercado (REM), informe {rem.informe}. Refleja la opinión de un
        panel de analistas, no un precio de mercado negociable ni una proyección propia.
      </p>
    </Card>
  )
}
