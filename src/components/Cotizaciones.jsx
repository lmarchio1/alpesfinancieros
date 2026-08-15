import { useState } from 'react'
import SectionHeading from './ui/SectionHeading'
import DolaresTab from './cotizaciones/DolaresTab'
import BonosTab from './cotizaciones/BonosTab'
import InflacionTab from './cotizaciones/InflacionTab'
import OtrasMonedasTab from './cotizaciones/OtrasMonedasTab'
import calculadoraMercado from '../assets/calculadora-mercado.jpg'

const TOGGLES = [
  { id: 'dolares', label: 'Dólares' },
  { id: 'bonos', label: 'Bonos' },
  { id: 'inflacion', label: 'Inflación' },
  { id: 'monedas', label: 'Otras Monedas' },
]

const TOOLKIT_TAGS = [
  'Dólar oficial, blue, MEP y CCL',
  'Globales, Bonares, Boncer, Letras y duales',
  'Calculadora de breakeven',
  'Riesgo país en vivo',
  'Calculadora de inflación',
]

export default function Cotizaciones() {
  const [abierto, setAbierto] = useState(null)

  const toggle = (id) => setAbierto((prev) => (prev === id ? null : id))

  return (
    <section
      id="cotizaciones"
      className="relative flex min-h-[600px] items-center overflow-hidden bg-[#050a06] py-20 shadow-[inset_0_10px_14px_-12px_rgba(0,0,0,0.5)]"
    >
      <img
        src={calculadoraMercado}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover saturate-[1.7]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(4,10,6,0.88) 0%, rgba(4,10,6,0.8) 20%, rgba(4,14,8,0.3) 48%, rgba(4,14,8,0.32) 68%, rgba(4,10,6,0.85) 100%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          variant="dark"
          eyebrow="Mercado"
          title="Datos de Mercado"
          description="Precio del dólar en todas sus variantes y cotizaciones de letras y bonos, actualizados en tiempo real."
        />

        <div className="mb-8 flex flex-wrap gap-3">
          {TOOLKIT_TAGS.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/20"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mb-8 inline-flex rounded-xl bg-white/10 p-1 shadow-sm ring-1 ring-white/20 backdrop-blur-sm">
          {TOGGLES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              aria-expanded={abierto === t.id}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                abierto === t.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {abierto === 'dolares' && (
          <div className="mb-10">
            <DolaresTab />
          </div>
        )}
        {abierto === 'bonos' && (
          <div className="mb-10">
            <BonosTab />
          </div>
        )}
        {abierto === 'inflacion' && (
          <div className="mb-10">
            <InflacionTab />
          </div>
        )}
        {abierto === 'monedas' && <OtrasMonedasTab />}
      </div>
    </section>
  )
}
