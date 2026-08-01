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
  {
    icon: 'pie',
    color: 'bg-blue-50 text-blue-600',
    title: 'Gestión financiera',
    items: ['Asset allocation y portafolios a medida', 'Reporte global consolidado', 'Custodia internacional multibanco'],
  },
  {
    icon: 'scale',
    color: 'bg-rose-50 text-rose-600',
    title: 'Sucesión y legal',
    items: [
      'Planificación sucesoria (estate planning)',
      'Estructuras offshore, trusts y fideicomisos',
      'Protección patrimonial integral',
    ],
  },
  {
    icon: 'bank',
    color: 'bg-emerald-50 text-emerald-600',
    title: 'Eficiencia fiscal',
    items: ['Optimización impositiva internacional', 'Cumplimiento normativo (CRS / FATCA)', 'Real estate y activos alternativos'],
  },
  {
    icon: 'home',
    color: 'bg-amber-50 text-amber-600',
    title: 'Gobernanza familiar',
    items: [
      'Protocolo familiar y sucesión empresaria',
      'Capacitación de las próximas generaciones',
      'CFO / concierge administrativo',
    ],
  },
]

const PROCESO = [
  {
    paso: '01',
    title: 'Diagnóstico',
    description: 'Auditoría inicial del patrimonio, las estructuras existentes y los objetivos familiares.',
  },
  {
    paso: '02',
    title: 'Estrategia 360°',
    description: 'Diseño de la arquitectura legal, fiscal y de asignación de activos a medida.',
  },
  {
    paso: '03',
    title: 'Implementación',
    description: 'Apertura de cuentas, ejecución legal e instalación de los canales de custodia.',
  },
  {
    paso: '04',
    title: 'Monitoreo',
    description: 'Consolidación global de reportes y reuniones periódicas de gobernanza.',
  },
]

export default function WealthManagement() {
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

        <div className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              Modelo de asesoramiento 360°
            </span>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Todo tu patrimonio, bajo un mismo techo
            </h3>
            <p className="mt-3 text-base text-slate-600">
              Cuatro disciplinas coordinadas por un mismo equipo, para que ninguna decisión se
              tome sin ver el panorama completo.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {MODELO_360.map((bloque) => (
              <Card key={bloque.title} className="p-6">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${bloque.color}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                    {ICONS[bloque.icon]}
                  </svg>
                </div>
                <h4 className="mt-4 font-semibold text-slate-900">{bloque.title}</h4>
                <ul className="mt-3 space-y-2">
                  {bloque.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-20">
          <div className="max-w-2xl">
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              Metodología
            </span>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              De la auditoría inicial a la gobernanza continua
            </h3>
            <p className="mt-3 text-base text-slate-600">
              No vendemos productos ni cobramos por operación: cobramos un fee por el servicio de
              gestión, así nuestros intereses quedan alineados con los tuyos en cada decisión.
            </p>
          </div>

          <div className="relative mt-10 grid grid-cols-1 gap-8 md:grid-cols-4">
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
