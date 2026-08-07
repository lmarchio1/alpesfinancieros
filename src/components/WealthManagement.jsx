import { useEffect, useRef, useState } from 'react'
import SectionHeading from './ui/SectionHeading'
import Card from './ui/Card'
import Modelo360Donut from './ui/Modelo360Donut'
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

const PILARES = ['Sin conflictos de interés', 'Estructura multijurisdiccional', 'Gobernanza familiar']

const ITEMS = [
  {
    icon: 'shield',
    title: 'Independencia y transparencia',
    description: 'Sin ataduras a bancos: recomendaciones alineadas solo con tus intereses.',
  },
  {
    icon: 'compass',
    title: 'Visión global de mercados',
    description: 'Acceso a activos locales e internacionales para diversificar tu cartera.',
  },
  {
    icon: 'users',
    title: 'Gestión personalizada',
    description: 'Un plan patrimonial diseñado según tu perfil de riesgo y tus objetivos.',
  },
  {
    icon: 'trending',
    title: 'Seguimiento en tiempo real',
    description: 'Cotizaciones y calculadora de bonos actualizadas para decidir con información al día.',
  },
]

const MODELO_360 = [
  { icon: 'pie', color: 'bg-[#fdf6e3] text-[#c9971c]', border: 'border-l-[#c9971c]', title: 'Gestión financiera' },
  { icon: 'scale', color: 'bg-[#fbeed6] text-[#a8681a]', border: 'border-l-[#a8681a]', title: 'Sucesión y legal' },
  { icon: 'bank', color: 'bg-[#f7e3d3] text-[#8a4f1e]', border: 'border-l-[#8a4f1e]', title: 'Eficiencia fiscal' },
  { icon: 'home', color: 'bg-[#f0e0cc] text-[#5f3a16]', border: 'border-l-[#5f3a16]', title: 'Gobernanza familiar' },
]

const PROCESO = [
  {
    paso: '01',
    color: 'bg-blue-600',
    title: 'Diagnóstico',
    description: 'Auditoría inicial del patrimonio, las estructuras existentes y los objetivos familiares.',
  },
  {
    paso: '02',
    color: 'bg-rose-600',
    title: 'Estrategia 360°',
    description: 'Diseño de la arquitectura legal, fiscal y de asignación de activos a medida.',
  },
  {
    paso: '03',
    color: 'bg-emerald-600',
    title: 'Implementación',
    description: 'Apertura de cuentas, ejecución legal e instalación de los canales de custodia.',
  },
  {
    paso: '04',
    color: 'bg-amber-600',
    title: 'Monitoreo',
    description: 'Consolidación global de reportes y reuniones periódicas de gobernanza.',
  },
]

export default function WealthManagement() {
  const procesoRef = useRef(null)
  const [procesoVisible, setProcesoVisible] = useState(false)

  useEffect(() => {
    const el = procesoRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setProcesoVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="gestion" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Gestión patrimonial · Multi-family office"
          title="Un socio estratégico para tu patrimonio"
          description="Como multi-family office, unificamos la gestión financiera, legal, fiscal y de gobernanza familiar bajo un mismo equipo, actuando siempre del lado de tus intereses."
        />

        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {PILARES.map((pilar) => (
            <span
              key={pilar}
              className="rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-100"
            >
              {pilar}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <Card key={item.title} className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
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

      <div className="relative mt-20 overflow-hidden">
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
              <Modelo360Donut />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-3">
              {MODELO_360.map((bloque) => (
                <Card
                  key={bloque.title}
                  className={`flex items-center gap-4 border-l-4 bg-white/95 p-5 shadow-lg backdrop-blur ${bloque.border}`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${bloque.color}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                      {ICONS[bloque.icon]}
                    </svg>
                  </div>
                  <h4 className="font-semibold text-slate-900">{bloque.title}</h4>
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
              Nos enfocamos en definir la estrategia de inversión adecuada para vos —y en
              sostenerla en el tiempo. No vendemos productos ni cobramos por operación: cobramos
              un fee por el servicio de gestión, así nuestros intereses quedan alineados con los
              tuyos en cada decisión.
            </p>
          </div>

          <div ref={procesoRef} className="relative mt-10 grid grid-cols-1 gap-8 md:grid-cols-4">
            <div
              aria-hidden="true"
              className="absolute top-6 left-0 right-0 hidden h-px bg-slate-200 md:block"
            />
            {PROCESO.map((paso, i) => (
              <div
                key={paso.paso}
                className={`relative text-center transition-all duration-700 ease-out motion-reduce:transition-none md:text-left ${
                  procesoVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
                style={{ transitionDelay: procesoVisible ? `${i * 150}ms` : '0ms' }}
              >
                <span
                  className={`relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full font-bold text-white transition-transform duration-300 ease-out hover:scale-125 hover:shadow-lg md:mx-0 ${paso.color}`}
                >
                  {paso.paso}
                </span>
                <h4 className="mt-4 font-semibold text-slate-900">{paso.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{paso.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
