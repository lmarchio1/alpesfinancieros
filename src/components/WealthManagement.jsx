import { useState } from 'react'
import SectionHeading from './ui/SectionHeading'
import Card from './ui/Card'
import Modelo360Donut from './ui/Modelo360Donut'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'
import oroMercado from '../assets/oro-mercado.jpg'

const ICONS = {
  shield: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l7 3v5c0 4.5-3 8.25-7 9.5-4-1.25-7-5-7-9.5V6l7-3z"
    />
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-2 6-6 2 2-6 6-2z" />
    </>
  ),
  users: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 11a3 3 0 10-3-3M8 11a3 3 0 103-3M2 20c0-3 3-5 6-5s6 2 6 5M12.5 15c2.5.3 4.5 2.1 4.5 5"
    />
  ),
  trending: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M15 7h6v6" />
  ),
  pie: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v9h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.49 15a9 9 0 11-6.49-11.72" />
    </>
  ),
  scale: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v18M8 21h8M5 7l-3 6a3 3 0 006 0l-3-6zM19 7l-3 6a3 3 0 006 0l-3-6zM5 7h14"
    />
  ),
  bank: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 21h18M4 10v11M20 10v11M2 10l10-6 10 6M8 10v11M16 10v11"
    />
  ),
  home: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l9-8 9 8M5 10v10h14V10M9 20v-6h6v6" />
  ),
}

const ITEMS = [
  {
    icon: 'shield',
    title: 'Independencia y transparencia',
    description:
      'La integridad rige cada decisión: actuamos con absoluta independencia, garantizando que nuestros objetivos estén siempre alineados con los de nuestros clientes.',
  },
  {
    icon: 'compass',
    title: 'Visión global y diversificación',
    description:
      'Análisis integral y permanente de los mercados locales e internacionales, para orientar una adecuada asignación de activos, optimizando el patrimonio y mitigando los riesgos.',
  },
  {
    icon: 'users',
    title: 'Estrategia a medida',
    description:
      'Diseñamos estrategias adaptadas a la realidad de cada cliente. Integramos la gestión financiera, la planificación patrimonial y la optimización fiscal con el máximo rigor profesional.',
  },
  {
    icon: 'trending',
    title: 'Monitoreo e inteligencia de datos',
    description:
      'Seguimiento continuo de variables macroeconómicas e indicadores clave de mercado, respaldando la toma de decisiones con análisis riguroso e información consolidada.',
  },
]

const MODELO_360 = [
  {
    icon: 'pie',
    color: 'bg-[#fdf6e3] text-[#dba61f] group-hover:bg-[#dba61f] group-hover:text-white',
    border: 'border-l-[#dba61f]',
    title: 'Estrategia Financiera',
    description:
      'Diseño, análisis y seguimiento de la estructura patrimonial para preservar y potenciar el capital en el largo plazo.',
  },
  {
    icon: 'scale',
    color: 'bg-[#fbeed6] text-[#c17a1e] group-hover:bg-[#c17a1e] group-hover:text-white',
    border: 'border-l-[#c17a1e]',
    title: 'Planificación Sucesoria',
    description:
      'Asesoramiento integral en la transmisión ordenada del patrimonio, garantizando la protección del legado familiar.',
  },
  {
    icon: 'bank',
    color: 'bg-[#f7e3d3] text-[#a35f24] group-hover:bg-[#a35f24] group-hover:text-white',
    border: 'border-l-[#a35f24]',
    title: 'Eficiencia fiscal',
    description:
      'Estrategias tributarias integrales orientadas a minimizar el impacto fiscal y proteger el rendimiento del capital global.',
  },
  {
    icon: 'home',
    color: 'bg-[#f0e0cc] text-[#7a4a1c] group-hover:bg-[#7a4a1c] group-hover:text-white',
    border: 'border-l-[#7a4a1c]',
    title: 'Gobernanza familiar',
    description:
      'Acuerdos y protocolos estratégicos que ordenan la toma de decisiones y profesionalizan la administración del patrimonio.',
  },
]

const PROCESO = [
  {
    paso: '01',
    color: 'bg-[#dba61f]',
    glow: 'shadow-[#dba61f]/40',
    title: 'Diagnóstico',
    description:
      'Relevamiento integral del patrimonio global, análisis detallado de la estructura actual y alineación de objetivos familiares.',
  },
  {
    paso: '02',
    color: 'bg-[#c17a1e]',
    glow: 'shadow-[#c17a1e]/40',
    title: 'Estrategia 360°',
    description:
      'Diseño integral de la planificación fiscal, arquitectura patrimonial y política de asignación de activos a medida.',
  },
  {
    paso: '03',
    color: 'bg-[#a35f24]',
    glow: 'shadow-[#a35f24]/40',
    title: 'Implementación',
    description:
      'Acompañamiento en la puesta en marcha, coordinación operativa y articulación del plan estratégico definido.',
  },
  {
    paso: '04',
    color: 'bg-[#7a4a1c]',
    glow: 'shadow-[#7a4a1c]/40',
    title: 'Monitoreo',
    description:
      'Consolidación de reportes, seguimiento periódico de objetivos y acompañamiento continuo en la toma de decisiones.',
  },
]

export default function WealthManagement() {
  const [itemsRef, itemsVisible] = useRevealOnScroll()
  const [procesoRef, procesoVisible] = useRevealOnScroll()
  const [activeDisciplina, setActiveDisciplina] = useState(null)

  return (
    <section id="gestion" className="py-20 shadow-[inset_0_10px_14px_-12px_rgba(0,0,0,0.35)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Gestión patrimonial · Multi-family office"
          title="Un socio estratégico e independiente para su patrimonio"
          description="Como Multi-Family Office, unificamos la gestión financiera, legal, fiscal y de gobernanza bajo una misma estructura, alineando cada decisión exclusivamente con sus objetivos."
        />

        <div ref={itemsRef} className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, i) => (
            <Card
              key={item.title}
              className={`group !bg-[#f2f6f0] p-6 shadow-md shadow-slate-200/70 transition-all duration-700 ease-out hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none ${
                itemsVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
              style={{ transitionDelay: itemsVisible ? `${i * 120}ms` : '0ms' }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0e5035]/10 text-[#0e5035] transition-colors duration-300 group-hover:bg-[#0e5035] group-hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                  {ICONS[item.icon]}
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="relative mt-20 overflow-hidden shadow-[inset_0_10px_14px_-12px_rgba(0,0,0,0.5),inset_0_-10px_14px_-12px_rgba(0,0,0,0.5)]">
        <img
          src={oroMercado}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(12,9,3,0.85) 0%, rgba(12,9,3,0.62) 30%, rgba(12,9,3,0.6) 65%, rgba(12,9,3,0.85) 100%)',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-300">
              Modelo de asesoramiento 360°
            </span>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Todo tu patrimonio, bajo un mismo techo
            </h3>
            <p className="mt-3 text-base text-slate-300">
              Cuatro disciplinas coordinadas por un mismo equipo, para que ninguna decisión se
              tome sin ver el panorama completo.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Modelo360Donut activeIndex={activeDisciplina} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-3">
              {MODELO_360.map((bloque, i) => (
                <Card
                  key={bloque.title}
                  tabIndex={0}
                  onMouseEnter={() => setActiveDisciplina(i)}
                  onMouseLeave={() => setActiveDisciplina(null)}
                  onFocus={() => setActiveDisciplina(i)}
                  onBlur={() => setActiveDisciplina(null)}
                  className={`group flex items-start gap-4 border-l-[6px] bg-white/95 p-5 shadow-lg backdrop-blur transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl focus:-translate-y-1 focus:shadow-xl focus:outline-none ${bloque.border}`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ease-out group-hover:scale-110 ${bloque.color}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                      {ICONS[bloque.icon]}
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{bloque.title}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{bloque.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="mt-20 rounded-3xl p-8 sm:p-12"
          style={{
            background:
              'linear-gradient(135deg, rgba(37,99,235,0.07), rgba(225,29,72,0.07) 35%, rgba(5,150,105,0.07) 65%, rgba(217,119,6,0.07))',
          }}
        >
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              Evaluación integral del patrimonio
            </span>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Un proceso, no una única decisión
            </h3>
            <p className="mt-3 text-base text-slate-600">
              Diseñamos e implementamos una estrategia patrimonial alineada exclusivamente con
              los objetivos y la visión de cada familia o empresa. Nuestro compromiso es actuar
              con absoluta independencia y rigor técnico, garantizando una administración sólida
              y sostenible a lo largo del tiempo.
            </p>
          </div>

          <div ref={procesoRef} className="relative mt-10 grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Línea horizontal (desktop) */}
            <div
              aria-hidden="true"
              className="absolute top-7 left-0 right-0 hidden h-px bg-slate-200 md:block"
            />
            <div
              aria-hidden="true"
              className={`absolute top-7 left-0 hidden h-px origin-left bg-slate-400 transition-transform duration-[1400ms] ease-out motion-reduce:transition-none md:block ${
                procesoVisible ? 'scale-x-100' : 'scale-x-0'
              }`}
              style={{ right: 0 }}
            />

            {/* Línea vertical (mobile) */}
            <div
              aria-hidden="true"
              className="absolute left-7 top-7 bottom-7 block w-px bg-slate-200 md:hidden"
            />
            <div
              aria-hidden="true"
              className={`absolute left-7 top-7 bottom-7 block w-px origin-top bg-slate-400 transition-transform duration-[1400ms] ease-out motion-reduce:transition-none md:hidden ${
                procesoVisible ? 'scale-y-100' : 'scale-y-0'
              }`}
            />

            {PROCESO.map((paso, i) => (
              <div
                key={paso.paso}
                className={`relative flex items-start gap-4 text-left transition-all duration-700 ease-out motion-reduce:transition-none md:block ${
                  procesoVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
                style={{ transitionDelay: procesoVisible ? `${i * 150}ms` : '0ms' }}
              >
                <span
                  className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-lg transition-transform duration-300 ease-out hover:scale-125 ${paso.color} ${paso.glow}`}
                >
                  {paso.paso}
                </span>
                <div className="md:mt-4">
                  <h4 className="font-semibold text-slate-900">{paso.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{paso.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
