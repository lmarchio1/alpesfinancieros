import Logo from './ui/Logo'
import LinkedInIcon from './ui/LinkedInIcon'

const YEAR = new Date().getFullYear()
const LINKEDIN_URL = 'https://www.linkedin.com/company/alpes-estados-financieros/'

const COMPANY_LINKS = [
  { label: 'Gestión patrimonial', href: '#gestion' },
  { label: 'Datos de Mercado', href: '#cotizaciones' },
  { label: 'Quiénes somos', href: '#inicio' },
  { label: 'Contacto', href: '#contacto' },
]

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Logo
              variant="light"
              iconClassName="h-16 w-auto sm:h-20"
              nameClassName="text-3xl sm:text-4xl"
              taglineClassName="text-xs sm:text-sm"
              gap="gap-4"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Compañía</h3>
            <ul className="mt-4 space-y-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-slate-400 hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-slate-800 pt-8 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-500">
            © {YEAR} Alpes Estados Financieros. Todos los derechos reservados.
          </p>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Alpes Estados Financieros en LinkedIn"
            className="text-slate-400 transition-colors hover:text-white"
          >
            <LinkedInIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  )
}
