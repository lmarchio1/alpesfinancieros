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
  // Cuatro íconos con más detalle que otros ya usados más arriba en la
  // página (compass/trending), para que "Un proceso, no una única decisión"
  // no se sienta genérico ni repita nada.
  searchPro: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.5 20.5l-4.3-4.3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 11l1.8 1.8 3.2-4" />
      <path strokeLinecap="round" strokeLinejoin="round" opacity="0.5" d="M7.7 6.8a4.7 4.7 0 013-1.4" />
    </>
  ),
  compassPro: (
    <>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="6.3" strokeWidth="1" opacity="0.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.3v1.7M12 20v1.7M2.3 12H4M20 12h1.7" />
      <path strokeLinecap="round" strokeLinejoin="round" fill="currentColor" d="M15 9l-2.2 5.8L9 17l2.2-5.8z" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </>
  ),
  gearPro: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82A1.65 1.65 0 003 13.5H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
    />
  ),
  barsTrend: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18" />
      <path strokeLinecap="round" strokeLinejoin="round" opacity="0.5" d="M6 20v-4M11 20v-8M16 20v-11" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 13l5-4 4 3 7-7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 4h4v4" />
    </>
  ),
}

const ITEMS = [
  {
    icon: 'shield',
    title: 'Independencia y transparencia',
    description:
      'La integridad rige cada decisión: actuamos con absoluta independencia, garantizando que nuestras recomendaciones estén siempre alineadas exclusivamente con sus objetivos.',
  },
  {
    icon: 'compass',
    title: 'Visión global y diversificación',
    description:
      'Análisis permanente de las variables económicas y financieras a escala global y nacional, para orientar una adecuada recomendación de activos, optimizando la eficiencia fiscal y alineándose con sus métricas de crecimiento y límites de riesgo definidos.',
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
      'Seguimiento continuo de variables macroeconómicas e indicadores clave de mercado, respaldando la toma de decisiones con información consolidada y análisis riguroso.',
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
    color: 'bg-[#fbe8d9] text-[#b8622f] group-hover:bg-[#b8622f] group-hover:text-white',
    border: 'border-l-[#b8622f]',
    title: 'Planificación Sucesoria',
    description:
      'Asesoramiento integral en la transmisión ordenada del patrimonio, garantizando la protección del legado familiar.',
  },
  {
    icon: 'bank',
    color: 'bg-[#f7e0df] text-[#9a2e2e] group-hover:bg-[#9a2e2e] group-hover:text-white',
    border: 'border-l-[#9a2e2e]',
    title: 'Eficiencia fiscal',
    description:
      'Estrategias tributarias integrales orientadas a minimizar el impacto fiscal y proteger el rendimiento del capital global.',
  },
  {
    icon: 'home',
    color: 'bg-[#efdadd] text-[#6b1220] group-hover:bg-[#6b1220] group-hover:text-white',
    border: 'border-l-[#6b1220]',
    title: 'Gobernanza familiar',
    description:
      'Acuerdos y protocolos estratégicos que ordenan la toma de decisiones y profesionalizan la administración del patrimonio.',
  },
]

const PROCESO = [
  {
    paso: '01',
    icon: 'searchPro',
    color: 'bg-brand-400',
    glow: 'shadow-brand-400/40',
    title: 'Diagnóstico',
    description:
      'Relevamiento integral del patrimonio global, análisis detallado de la estructura actual y alineación de objetivos familiares.',
  },
  {
    paso: '02',
    icon: 'compassPro',
    color: 'bg-brand-500',
    glow: 'shadow-brand-500/40',
    title: 'Estrategia 360°',
    description:
      'Diseño integral de la planificación fiscal, arquitectura patrimonial y política de asignación de activos a medida.',
  },
  {
    paso: '03',
    icon: 'gearPro',
    color: 'bg-brand-600',
    glow: 'shadow-brand-600/40',
    title: 'Implementación',
    description:
      'Acompañamiento en la puesta en marcha, coordinación operativa y articulación del plan estratégico definido.',
  },
  {
    paso: '04',
    icon: 'barsTrend',
    color: 'bg-brand-700',
    glow: 'shadow-brand-700/40',
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
          description="Nuestra misión como Multi-Family Office es optimizar la administración de liquidez y patrimonio bajo un marco de estricto rigor legal y tributario, alineando cada decisión a los objetivos de crecimiento y perfil de riesgo de nuestros clientes."
        />

        <div ref={itemsRef} className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, i) => (
            <Card
              key={item.title}
              className={`group min-h-[304px] !bg-[#f2f6f0] p-6 shadow-md shadow-slate-200/70 transition-all duration-700 ease-out hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none ${
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
                  className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-300 ease-out hover:scale-125 ${paso.color} ${paso.glow}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                    {ICONS[paso.icon]}
                  </svg>
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-700 shadow ring-1 ring-slate-200">
                    {paso.paso}
                  </span>
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
