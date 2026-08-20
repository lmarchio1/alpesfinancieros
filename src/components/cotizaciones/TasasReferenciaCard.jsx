import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import { fetchTasasReferencia } from '../../services/bcraApi'

export default function TasasReferenciaCard() {
  const [tasas, setTasas] = useState(null)

  useEffect(() => {
    fetchTasasReferencia()
      .then(setTasas)
      .catch(() => setTasas(null))
  }, [])

  if (!tasas || (!tasas.badlar && !tasas.tamar)) return null

  return (
    <Card className="group border-t-4 border-indigo-500 p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <circle cx="7" cy="7" r="3" />
            <circle cx="17" cy="17" r="3" />
            <path strokeLinecap="round" d="M17 7L7 17" />
          </svg>
        </div>
        <p className="font-semibold text-slate-900">Tasas de referencia (BCRA)</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {tasas.badlar && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">BADLAR</p>
            <p className="mt-0.5 text-2xl font-bold text-slate-900">{tasas.badlar.valor.toFixed(2)}%</p>
            <p className="mt-1 text-xs text-slate-400">
              Tasa promedio para depósitos a plazo fijo mayoristas en bancos privados (estrato
              superior a $1M, plazo 30-35 días).
            </p>
          </div>
        )}
        {tasas.tamar && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">TAMAR</p>
            <p className="mt-0.5 text-2xl font-bold text-slate-900">{tasas.tamar.valor.toFixed(2)}%</p>
            <p className="mt-1 text-xs text-slate-400">
              Tasa de referencia del BCRA para depósitos del segmento corporativo e institucional
              (operaciones desde $1.000M).
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
