import Logo from './ui/Logo'
import LinkedInIcon from './ui/LinkedInIcon'

const YEAR = new Date().getFullYear()
const LINKEDIN_URL = 'https://www.linkedin.com/company/alpes-estados-financieros/'

const COMPANY_LINKS = [
  { label: 'Gestión patrimonial', href: '#gestion' },
  { label: 'Indicadores de Mercado', href: '#cotizaciones' },
  { label: 'Quiénes somos', href: '#inicio' },
  { label: 'Contacto', href: '#contacto' },
]

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-10 sm:flex-row sm:items-center sm:justify-between">
          <Logo
            variant="light"
            iconClassName="h-16 w-auto sm:h-20"
            nameClassName="text-3xl sm:text-4xl"
            taglineClassName="text-xs sm:text-sm"
            gap="gap-4"
          />

          <div className="flex flex-col gap-10 sm:flex-row sm:gap-16">
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

            <div>
              <h3 className="text-sm font-semibold text-white">Seguinos</h3>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-3 rounded-full bg-white/10 py-2 pl-2 pr-5 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A66C2] text-white">
                  <LinkedInIcon className="h-5 w-5" />
                </span>
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-8">
          <p className="text-xs text-slate-500">
            © {YEAR} Alpes Estados Financieros. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
