import { useCountUp } from '../hooks/useCountUp'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'
import retrato from '../assets/daniel-marchioni.webp'

// Carta de presentación del socio fundador. Va antes de Contacto: después de ver qué
// hace Alpes y sus indicadores, el visitante conoce quién está detrás, y de ahí pasa a
// escribir. Sección clara entre dos oscuras (Indicadores y Contacto), para que respire.
//
// La foto es una versión procesada del original del celular: recortada a 4:5, a 800px
// y sin metadatos (el original traía la ubicación GPS de donde se sacó).

// Formación: título y, debajo, la institución.
// Antes eran tarjetas, pero el texto de docencia es más largo y estiraba la fila,
// dejando huecos vacíos en las otras dos.
const FORMACION = [
  { titulo: 'Contador Público', detalle: 'Universidad de Buenos Aires (UBA)' },
  { titulo: 'Posgrado en Administración Financiera', detalle: 'Universidad de Buenos Aires (UBA)' },
  {
    titulo: 'Docencia universitaria',
    detalle: 'Ex Profesor de Mercado de Capitales y Análisis de Inversiones en la Universidad de Palermo',
  },
]

export default function SocioDirector() {
  const [ref, visible] = useRevealOnScroll(0.15)
  // Los años de trayectoria cuentan de 0 a 40 recién cuando la sección aparece en
  // pantalla, con el mismo contador que usa el riesgo país. Quien pidió reducir el
  // movimiento ve el 40 directo.
  const anios = useCountUp(visible ? 40 : 0, 1200)
  const entrada = (demora) =>
    `transition-all duration-700 ease-out motion-reduce:transition-none ${
      visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
    } ${demora}`

  return (
    <section id="quienes-somos" className="bg-white py-12 shadow-[inset_0_10px_14px_-12px_rgba(0,0,0,0.35)]">
      <div
        ref={ref}
        className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-14 lg:px-8"
      >
        {/* Retrato, con un marco dorado desplazado detrás y el dato de trayectoria encima. */}
        {/* El relleno a la derecha y abajo deja lugar para el marco desplazado: sin él, en
            el celular el marco tocaba el borde de la pantalla. */}
        <div className={`mx-auto w-full max-w-sm pb-4 pr-4 lg:col-span-5 lg:mx-0 lg:max-w-none ${entrada('')}`}>
          {/* Al pasar el mouse la foto se acerca apenas dentro de su marco y el marco dorado
              se acomoda hacia ella: la misma clase de reacción que las tarjetas del sitio. */}
          <div className="group relative">
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-4 translate-y-4 rounded-2xl border-2 border-[#dba61f]/70 transition-transform duration-500 ease-out group-hover:translate-x-2 group-hover:translate-y-2 motion-reduce:transition-none"
            />
            <div className="relative overflow-hidden rounded-2xl shadow-xl shadow-slate-900/20">
              <img
                src={retrato}
                alt="Daniel Marchioni, socio fundador y director de Alpes Estados Financieros"
                width="800"
                height="1000"
                loading="lazy"
                className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </div>
            <div className="absolute -bottom-6 left-4 rounded-xl bg-brand-600 px-5 py-4 text-white shadow-lg shadow-slate-900/30 sm:left-6">
              <p className="text-3xl font-bold leading-none tabular-nums">
                {/* El número animado es solo visual: el lector de pantalla lee el valor final. */}
                <span aria-hidden="true">+{anios}</span>
                <span className="sr-only">Más de 40</span>
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-100">años de trayectoria</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className={entrada('delay-100')}>
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-600">Quiénes somos</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Daniel Marchioni</h2>
            <p className="mt-1 text-lg font-medium text-[#a8791b]">Socio Fundador &amp; Director</p>
          </div>

          <div className={`mt-6 ${entrada('delay-200')}`}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Trayectoria y experiencia institucional
            </h3>
            <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
              <p>
                Daniel cuenta con más de cuatro décadas de trayectoria en el sistema financiero, el mercado de capitales
                y la gestión patrimonial integral para familias y empresas.
              </p>
              <p>
                A lo largo de su carrera profesional, lideró carteras de Banca Privada y servicios de Family Office en
                instituciones de primer nivel como Merrill Lynch, Consultatio Asesores Independientes y Capital
                Asesores. Previamente, consolidó su experiencia en la banca corporativa como Oficial de Negocios en BBVA
                Francés, tras haber desempeñado funciones directivas en áreas de finanzas y tesorería en empresas del
                sector real.
              </p>
              <p>
                En Alpes, encabeza el diseño estratégico de portafolios de inversión, la consultoría tributaria sobre
                activos globales y la preservación patrimonial de largo plazo.
              </p>
            </div>
          </div>

          <div className={`mt-6 ${entrada('delay-300')}`}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Formación académica &amp; docencia
            </h3>
            {/* Tres columnas sin cajas, con una línea dorada fina arriba: ocupa un solo
                renglón de alto en vez de tres, y sin bordes no se nota que un texto sea más
                largo que los otros. La de docencia es más ancha porque su texto es el más largo.
                En el celular, una debajo de la otra. */}
            <dl className="mt-4 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-[1fr_1fr_1.5fr]">
              {FORMACION.map((item) => (
                <div key={item.titulo} className="border-t-2 border-[#dba61f]/60 pt-3">
                  <dt className="text-sm font-semibold text-slate-900">{item.titulo}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-600">{item.detalle}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
