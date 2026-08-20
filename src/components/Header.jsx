import { useEffect, useState } from 'react'
import Logo from './ui/Logo'
import LinkedInIcon from './ui/LinkedInIcon'

const NAV_LINKS = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#gestion', label: 'Gestión Patrimonial' },
  { href: '#cotizaciones', label: 'Inteligencia de Mercado' },
]

const LINKEDIN_URL = 'https://www.linkedin.com/company/alpes-estados-financieros/'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-colors ${
        isScrolled
          ? 'border-slate-200 bg-white/90 backdrop-blur'
          : 'border-transparent bg-white'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="#inicio" className="flex items-center">
          <Logo />
        </a>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-600"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Alpes Estados Financieros en LinkedIn"
            className="text-slate-500 transition-colors hover:text-brand-600"
          >
            <LinkedInIcon className="h-5 w-5" />
          </a>
          <a
            href="#contacto"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Hablá con nosotros
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menú"
          aria-expanded={isOpen}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {isOpen && (
        <nav className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-sm font-medium text-slate-700"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contacto"
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white"
            >
              Hablá con nosotros
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <LinkedInIcon className="h-5 w-5" />
              LinkedIn
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}
