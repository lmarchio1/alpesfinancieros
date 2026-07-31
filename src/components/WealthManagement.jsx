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
      </div>
    </section>
  )
}
