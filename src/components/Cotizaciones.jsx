import { useState } from 'react'
import SectionHeading from './ui/SectionHeading'
import DolaresTab from './cotizaciones/DolaresTab'
import BonosTab from './cotizaciones/BonosTab'
import InflacionTab from './cotizaciones/InflacionTab'
import OtrasMonedasTab from './cotizaciones/OtrasMonedasTab'
import calculadoraMercado from '../assets/calculadora-mercado.webp'

const TOGGLES = [
  { id: 'dolares', label: 'Tipos de Cambio' },
  { id: 'bonos', label: 'Renta Fija' },
  { id: 'inflacion', label: 'Inflación' },
  { id: 'monedas', label: 'Divisas y Metales' },
]

const TOOLKIT_TAGS = [
  'Brecha Cambiaria',
  'Títulos Públicos',
  'Tasas de depósitos',
  'Riesgo Soberano',
  'Métricas de Inflación',
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
        className={`absolute inset-0 h-full w-full object-cover saturate-[1.7] transition-[filter] duration-700 ease-out ${
          abierto ? 'blur-lg sm:blur-md' : 'blur-none'
        }`}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(4,10,6,0.88) 0%, rgba(4,10,6,0.8) 20%, rgba(4,14,8,0.3) 48%, rgba(4,14,8,0.32) 68%, rgba(4,10,6,0.85) 100%)',
        }}
      />
      {/* Al abrir una pestaña, la sección crece y el fondo (object-cover) se ve más
          "acercado" por el cambio de alto; se oscurece un poco más para que las
          tarjetas de datos queden en primer plano y ese zoom se note menos. Se usa el
          navy de marca (mismo que brand-600) en vez de verde para no competir con el
          borde verde de las tarjetas con variación positiva. */}
      <div
        className={`absolute inset-0 bg-brand-600 transition-opacity duration-700 ease-out ${
          abierto ? 'opacity-70 sm:opacity-55' : 'opacity-0'
        }`}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          variant="dark"
          eyebrow="Monitor de Mercado"
          title="Indicadores de Mercado"
          description="Monitoreo periódico y cotizaciones de referencia de tipos de cambio, títulos públicos, inflación e indicadores clave para la toma de decisiones estratégicas."
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

        <div className="mb-8 inline-flex rounded-xl bg-slate-900/70 p-1 shadow-lg shadow-black/40 ring-1 ring-white/15 backdrop-blur-md">
          {TOGGLES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              aria-expanded={abierto === t.id}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors [text-shadow:0_1px_2px_rgba(0,0,0,0.4)] ${
                abierto === t.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-100 hover:text-white'
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
