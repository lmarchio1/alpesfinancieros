import { useState } from 'react'
import SectionHeading from './ui/SectionHeading'
import WhatsAppIcon from './ui/WhatsAppIcon'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'
import toroWallStreet from '../assets/toro-wallstreet.jpg'

const CONTACT_ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT

const DIRECCION = 'Av. Rivadavia 1157, Piso 6 C, C1033AAB CABA, Argentina'
// La búsqueda por texto de Google confunde esta dirección con la calle Salta
// (a varias cuadras) o con otras "Rivadavia" del país (Pergamino, San Isidro).
// Coordenadas verificadas contra el código postal real (C1033AAB, San Nicolás,
// CABA) vía geocodificación cruzada, para que el pin no dependa de que el
// buscador de texto adivine bien.
const MAPS_LAT = -34.6084703
const MAPS_LNG = -58.3828441
const MAPS_EMBED_URL = `https://www.google.com/maps?q=${MAPS_LAT},${MAPS_LNG}&z=17&output=embed`
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${MAPS_LAT},${MAPS_LNG}`
const WHATSAPP_URL = 'https://wa.me/5491153439289'
const EMAIL_CONTACTO = 'contacto@alpesestadosfinancieros.com'

const INITIAL_FORM = { firstName: '', lastName: '', email: '', phone: '', message: '' }

export default function ContactForm() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [formRef, formVisible] = useRevealOnScroll()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')

    try {
      if (CONTACT_ENDPOINT) {
        const res = await fetch(CONTACT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            _cc: 'daniel.marchioni@alpesestadosfinancieros.com',
            _subject: 'Nueva consulta desde alpesestadosfinancieros.com.ar',
          }),
        })
        if (!res.ok) throw new Error('No se pudo enviar el formulario')
      } else {
        // Modo demo: no hay backend configurado, se simula el envío.
        await new Promise((resolve) => setTimeout(resolve, 700))
      }
      setStatus('sent')
      setForm(INITIAL_FORM)
    } catch {
      setStatus('error')
    }
  }

  return (
    <section
      id="contacto"
      className="relative flex min-h-[600px] items-center overflow-hidden bg-[#0b0704] py-20"
    >
      <img
        src={toroWallStreet}
        alt="Toro de Wall Street"
        className="absolute inset-0 h-full w-full object-cover object-[58%_18%] saturate-[1.35]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(11,7,4,0.78) 0%, rgba(11,7,4,0.48) 45%, rgba(11,7,4,0.85) 100%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          variant="dark"
          align="center"
          eyebrow="Contacto"
          title="Hablá con nosotros"
          description="Contanos qué necesitás y te respondemos a la brevedad."
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2 lg:self-start">
            <div className="space-y-4 rounded-2xl bg-white/10 p-6 backdrop-blur-sm sm:p-8">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl bg-[#25D366]/15 p-4 ring-1 ring-[#25D366]/30 transition-colors hover:bg-[#25D366]/25"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                  <WhatsAppIcon className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Escribinos por WhatsApp</p>
                  <p className="text-sm text-slate-300">Respuesta rápida</p>
                </div>
              </a>

              <a
                href={`mailto:${EMAIL_CONTACTO}`}
                className="flex items-start gap-3 rounded-xl p-4 transition-colors hover:bg-white/5"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 6h18v12H3zM3 7l9 6 9-6"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-white">Email</p>
                  <p className="text-sm text-slate-300 hover:text-white hover:underline">{EMAIL_CONTACTO}</p>
                </div>
              </a>

              <div className="flex items-start gap-3 p-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z"
                  />
                  <circle cx="12" cy="9.5" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-white">Oficina</p>
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-300 hover:text-white hover:underline"
                  >
                    {DIRECCION}
                  </a>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl">
                <iframe
                  title="Ubicación de Alpes Estados Financieros"
                  src={MAPS_EMBED_URL}
                  className="h-56 w-full grayscale-[15%]"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>

          <div
            ref={formRef}
            className={`lg:col-span-3 rounded-2xl bg-white/10 p-6 backdrop-blur-sm transition-all duration-700 ease-out motion-reduce:transition-none sm:p-8 ${
              formVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          <p className="mb-5 text-sm text-slate-300">
            Mandanos tu consulta y nos comunicaremos con vos lo más pronto posible.
          </p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              aria-label="Nombre"
              placeholder="Nombre"
              name="firstName"
              type="text"
              required
              value={form.firstName}
              onChange={handleChange}
              className="w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <input
              aria-label="Apellido"
              placeholder="Apellido"
              name="lastName"
              type="text"
              required
              value={form.lastName}
              onChange={handleChange}
              className="w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <input
              aria-label="Email"
              placeholder="Email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <input
              aria-label="Teléfono (opcional)"
              placeholder="Teléfono (opcional)"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              className="w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <textarea
              aria-label="Mensaje"
              placeholder="Mensaje"
              name="message"
              rows={4}
              required
              value={form.message}
              onChange={handleChange}
              className="w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:col-span-2"
            />

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
              >
                {status === 'sending' ? 'Enviando…' : 'Enviar mensaje'}
              </button>

              {status === 'sent' && (
                <div className="mt-3 flex items-start gap-2 text-sm text-emerald-400">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="mt-0.5 h-5 w-5 shrink-0 animate-pop motion-reduce:animate-none"
                  >
                    <circle cx="12" cy="12" r="10" className="opacity-30" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12.5l2.5 2.5L16 9.5" />
                  </svg>
                  <p>
                    ¡Gracias! Recibimos tu mensaje y te vamos a contactar pronto.
                    {!CONTACT_ENDPOINT && ' (modo demo: no se envió a ningún servidor)'}
                  </p>
                </div>
              )}
              {status === 'error' && (
                <p className="mt-3 text-sm text-rose-400">
                  Ocurrió un error al enviar el mensaje. Probá de nuevo.
                </p>
              )}
              {!CONTACT_ENDPOINT && status === 'idle' && (
                <p className="mt-3 text-xs text-slate-400">
                  Formulario en modo demo. Configurá VITE_CONTACT_ENDPOINT para conectarlo a un
                  servicio real (Formspree, EmailJS o un backend propio).
                </p>
              )}
            </div>
          </form>
          </div>
        </div>
      </div>
    </section>
  )
}
