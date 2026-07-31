import Logo from './ui/Logo'

const YEAR = new Date().getFullYear()

const COLUMNS = [
  {
    title: 'Producto',
    links: [
      { label: 'Gestión patrimonial', href: '#gestion' },
      { label: 'Cotizaciones', href: '#cotizaciones' },
      { label: 'Contacto', href: '#contacto' },
    ],
  },
  {
    title: 'Compañía',
    links: [
      { label: 'Quiénes somos', href: '#inicio' },
      { label: 'Trabajá con nosotros', href: '#contacto' },
      { label: 'Prensa', href: '#contacto' },
    ],
  },
  {
    title: 'Legales',
    links: [
      { label: 'Términos y condiciones', href: '#' },
      { label: 'Política de privacidad', href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Logo variant="light" />
            <p className="mt-4 max-w-sm text-sm text-slate-400">
              Información de mercado, cotizaciones y seguimiento de inversiones para tomar
              mejores decisiones financieras en Argentina.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-white">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-slate-400 hover:text-white">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-slate-800 pt-8">
          <p className="text-xs leading-relaxed text-slate-500">
            La información publicada en este sitio es de carácter informativo y no constituye
            una recomendación ni oferta de inversión. Las cotizaciones pueden tener demoras y
            estar sujetas a cambios. Antes de invertir, consultá con un asesor matriculado.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            © {YEAR} Alpes Estados Financieros. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
