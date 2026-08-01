import SectionHeading from './ui/SectionHeading'
import Card from './ui/Card'

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
}

const PROCESO = [
  {
    paso: '01',
    title: 'Planificación',
    description:
      'Relevamos tu situación patrimonial, tu horizonte y tus objetivos para armar una hoja de ruta clara, antes de hablar de instrumentos.',
  },
  {
    paso: '02',
    title: 'Implementación',
    description:
      'Elegimos los instrumentos según tu perfil de riesgo, priorizando diversificación y eficiencia por sobre la moda del momento.',
  },
  {
    paso: '03',
    title: 'Acompañamiento',
    description:
      'Revisamos el plan con regularidad, lo ajustamos frente a los cambios del mercado y te mantenemos informado en cada paso.',
  },
]

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

export default function WealthManagement() {
  return (
    <section id="gestion" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Gestión patrimonial"
          title="Un socio estratégico para tu patrimonio"
          description="Combinamos asesoramiento independiente con tecnología para que sigas cada decisión de inversión con claridad."
        />

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

        <div className="mt-20">
          <div className="max-w-2xl">
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              Nuestro proceso
            </span>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Acompañamiento real, no una transacción
            </h3>
            <p className="mt-3 text-base text-slate-600">
              No vendemos productos ni cobramos por operación: cobramos un fee por el servicio de
              gestión, así nuestros intereses quedan alineados con los tuyos en cada decisión.
            </p>
          </div>

          <div className="relative mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div
              aria-hidden="true"
              className="absolute top-6 left-0 right-0 hidden h-px bg-slate-200 md:block"
            />
            {PROCESO.map((paso) => (
              <div key={paso.paso} className="relative">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
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
