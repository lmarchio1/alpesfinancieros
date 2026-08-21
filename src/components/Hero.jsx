import heroMountains from '../assets/hero-mountains.webp'

export default function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden bg-[#050b1a]">
      <img
        src={heroMountains}
        alt="Cordillera nevada"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(100deg, rgba(5,11,26,0.94) 0%, rgba(9,23,46,0.82) 40%, rgba(14,42,82,0.45) 75%, rgba(14,42,82,0.25) 100%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="max-w-2xl">
          <h1
            className="animate-fade-up text-4xl font-bold tracking-tight text-white drop-shadow-sm motion-reduce:animate-none sm:text-5xl lg:text-6xl"
          >
            Gestión Financiera y Patrimonial con Visión Estratégica
          </h1>
          <p
            className="mt-6 animate-fade-up text-lg leading-relaxed text-slate-200 motion-reduce:animate-none"
            style={{ animationDelay: '120ms' }}
          >
            Multi-Family Office independiente dedicado a proteger y potenciar el patrimonio
            familiar y corporativo mediante estrategias a medida y análisis global.
          </p>
          <div
            className="mt-8 flex animate-fade-up flex-wrap gap-4 motion-reduce:animate-none"
            style={{ animationDelay: '360ms' }}
          >
            <a
              href="#gestion"
              className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Conocer la gestión patrimonial
            </a>
            <a
              href="#cotizaciones"
              className="rounded-lg bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur transition-colors hover:bg-white/20"
            >
              Ver inteligencia de mercado
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
