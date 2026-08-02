import { useState } from 'react'
import SectionHeading from './ui/SectionHeading'
import toroWallStreet from '../assets/toro-wallstreet.jpg'

const CONTACT_ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT

const INITIAL_FORM = { firstName: '', lastName: '', email: '', phone: '', message: '' }

export default function ContactForm() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

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
          body: JSON.stringify(form),
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

      <div className="relative mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          variant="dark"
          align="center"
          eyebrow="Contacto"
          title="Hablá con un asesor"
          description="Contanos qué necesitás y te respondemos a la brevedad."
        />

        <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm sm:p-8">
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
                <p className="mt-3 text-sm text-emerald-400">
                  ¡Gracias! Recibimos tu mensaje y te vamos a contactar pronto.
                  {!CONTACT_ENDPOINT && ' (modo demo: no se envió a ningún servidor)'}
                </p>
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
    </section>
  )
}
