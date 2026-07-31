import { useState } from 'react'
import SectionHeading from './ui/SectionHeading'
import DolaresTab from './cotizaciones/DolaresTab'
import BonosTab from './cotizaciones/BonosTab'

const TABS = [
  { id: 'dolares', label: 'Dólares' },
  { id: 'bonos', label: 'Bonos' },
]

export default function Cotizaciones() {
  const [tab, setTab] = useState('dolares')

  return (
    <section id="cotizaciones" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Mercado"
          title="Cotizaciones en tiempo real"
          description="Dólar en todas sus variantes, y el universo completo de bonos argentinos: Globales, Bonares, Boncer, Letras y duales, con calculadora de rendimientos, breakeven y sensibilidad al riesgo país."
        />

        <div className="mb-8 inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'dolares' && <DolaresTab />}
        {tab === 'bonos' && <BonosTab />}
      </div>
    </section>
  )
}
