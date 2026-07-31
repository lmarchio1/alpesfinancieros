import { useState } from 'react'
import SectionHeading from './ui/SectionHeading'
import Card from './ui/Card'
import toroWallStreet from '../assets/toro-wallstreet.jpg'

const CONTACT_ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT

const SUBJECTS = ['Asesoría de inversión', 'Consulta sobre cotizaciones', 'Soporte técnico', 'Otro']

const INITIAL_FORM = { name: '', email: '', phone: '', subject: SUBJECTS[0], message: '' }

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
    <section id="contacto" className="relative overflow-hidden bg-[#0b0704] py-20">
      <img
        src={toroWallStreet}
        alt="Toro de Wall Street"
        className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(11,7,4,0.85) 0%, rgba(11,7,4,0.72) 45%, rgba(11,7,4,0.92) 100%)',
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          variant="dark"
          align="center"
          eyebrow="Contacto"
          title="Hablá con un asesor"
          description="Contanos qué necesitás y te respondemos a la brevedad."
        />

        <Card className="p-6 shadow-xl sm:p-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Nombre y apellido
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                Teléfono (opcional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="subject" className="text-sm font-medium text-slate-700">
                Motivo
              </label>
              <select
                id="subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="message" className="text-sm font-medium text-slate-700">
                Mensaje
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                required
                value={form.message}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
              >
                {status === 'sending' ? 'Enviando…' : 'Enviar mensaje'}
              </button>

              {status === 'sent' && (
                <p className="mt-3 text-sm text-emerald-600">
                  ¡Gracias! Recibimos tu mensaje y te vamos a contactar pronto.
                  {!CONTACT_ENDPOINT && ' (modo demo: no se envió a ningún servidor)'}
                </p>
              )}
              {status === 'error' && (
                <p className="mt-3 text-sm text-rose-600">
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
        </Card>
      </div>
    </section>
  )
}
