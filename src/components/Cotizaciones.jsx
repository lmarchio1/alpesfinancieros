import { lazy, Suspense, useState } from 'react'
import SectionHeading from './ui/SectionHeading'
import ErrorBoundary from './ui/ErrorBoundary'
import calculadoraMercado from '../assets/calculadora-mercado.webp'

const CLAVE_RECARGA = 'alpes_recarga_pestania'

const marcarRecarga = () => {
  try {
    if (sessionStorage.getItem(CLAVE_RECARGA)) return false
    sessionStorage.setItem(CLAVE_RECARGA, '1')
    return true
  } catch {
    return false // Modo privado o sin storage: no se recarga, se muestra el aviso.
  }
}

// Cada deploy publica los archivos con un hash nuevo y borra los viejos. Una pestaña que
// quedó abierta desde antes pide un archivo que ya no existe, el import falla y la
// pestaña no puede renderizar. Se reintenta una vez -alcanza para un corte de red
// pasajero- y, si vuelve a fallar, se recarga la página una única vez para tomar la
// versión nueva del sitio.
function cargarPestania(importar) {
  return lazy(() =>
    importar().catch(() =>
      importar().catch((err) => {
        if (marcarRecarga()) window.location.reload()
        throw err
      }),
    ),
  )
}

// Carga diferida: estas 4 pestañas (y su dependencia de Supabase) solo se descargan
// cuando el visitante realmente toca el botón, en vez de sumarse al bundle principal
// que se carga siempre, aunque nunca se abra ninguna pestaña.
const DolaresTab = cargarPestania(() => import('./cotizaciones/DolaresTab'))
const BonosTab = cargarPestania(() => import('./cotizaciones/BonosTab'))
const InflacionTab = cargarPestania(() => import('./cotizaciones/InflacionTab'))
const OtrasMonedasTab = cargarPestania(() => import('./cotizaciones/OtrasMonedasTab'))
const TreasuriesTab = cargarPestania(() => import('./cotizaciones/TreasuriesTab'))

// Sin esto, una pestaña que falla se lleva puesta toda la sección de indicadores (el
// límite de error más cercano está en App.jsx, alrededor de Cotizaciones entera): se
// ocultaban también los botones y el resto de las pestañas, que funcionaban bien.
function Pestania({ nombre, children }) {
  return (
    <ErrorBoundary
      seccion={`Cotizaciones · ${nombre}`}
      fallback={
        <div className="rounded-xl bg-slate-900/50 px-4 py-6 text-center ring-1 ring-inset ring-white/10">
          <p className="text-sm text-slate-200">No pudimos mostrar {nombre} en este momento.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Reintentar
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

function TabSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  )
}

const TOGGLES = [
  { id: 'dolares', label: 'Tipos de Cambio' },
  { id: 'bonos', label: 'Renta Fija' },
  { id: 'treasuries', label: 'Tasas EEUU' },
  { id: 'inflacion', label: 'Inflación' },
  { id: 'monedas', label: 'Divisas y Metales' },
]

const TOOLKIT_TAGS = [
  'Brecha Cambiaria',
  'Títulos Públicos',
  'Tasas de depósitos',
  'Riesgo Soberano',
  'Métricas de Inflación',
]

export default function Cotizaciones() {
  const [abierto, setAbierto] = useState(null)

  const toggle = (id) => setAbierto((prev) => (prev === id ? null : id))

  return (
    <section
      id="cotizaciones"
      className="relative flex min-h-[600px] items-center overflow-hidden bg-[#050a06] py-20 shadow-[inset_0_10px_14px_-12px_rgba(0,0,0,0.5)]"
    >
      <img
        src={calculadoraMercado}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={`absolute inset-0 h-full w-full object-cover saturate-[1.7] transition-opacity duration-700 ease-out ${
          abierto ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(4,10,6,0.88) 0%, rgba(4,10,6,0.8) 20%, rgba(4,14,8,0.3) 48%, rgba(4,14,8,0.32) 68%, rgba(4,10,6,0.85) 100%)',
        }}
      />
      {/* Al abrir una pestaña, la sección crece y el fondo (object-cover) se ve más
          "acercado" por el cambio de alto. En vez de mostrar la foto recortada
          (borrosa o no), se reemplaza por un gris liso para que las tarjetas de datos
          queden en primer plano sin ese zoom ni el ruido de la foto. Un degradado
          radial (más claro arriba, oscureciendo hacia los bordes) en vez de un color
          plano, para que tenga algo de profundidad en vez de leerse como un bloque de
          color sin más. */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-out ${
          abierto ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, #94999e 0%, #7a7f84 45%, #55585c 100%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          variant="dark"
          eyebrow="Monitor de Mercado"
          title="Indicadores de Mercado"
          description="Monitoreo periódico y cotizaciones de referencia de tipos de cambio, títulos públicos, inflación e indicadores clave para la toma de decisiones estratégicas."
        />

        <div className="mb-8 flex flex-wrap gap-3">
          {TOOLKIT_TAGS.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/20"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* En el celular las cinco pestañas no entran en una línea. Dejarlas envolver
            libremente daba filas de distinto largo, desprolijas: acá van en dos columnas
            iguales, y la que queda sola ocupa el ancho completo. Desde tablet vuelven a
            ser una sola fila. */}
        <div className="mb-8 grid grid-cols-2 gap-1 rounded-xl bg-slate-900/40 p-1 shadow-md shadow-black/20 ring-1 ring-white/10 backdrop-blur-md sm:inline-flex sm:gap-0">
          {TOGGLES.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              aria-expanded={abierto === t.id}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors [text-shadow:0_1px_2px_rgba(0,0,0,0.4)] ${
                i === TOGGLES.length - 1 && TOGGLES.length % 2 === 1 ? 'col-span-2 sm:col-span-1' : ''
              } ${
                abierto === t.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-100 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Suspense fallback={<TabSkeleton />}>
          {abierto === 'dolares' && (
            <div className="mb-10">
              <Pestania nombre="Tipos de Cambio">
                <DolaresTab />
              </Pestania>
            </div>
          )}
          {abierto === 'bonos' && (
            <div className="mb-10">
              <Pestania nombre="Renta Fija">
                <BonosTab />
              </Pestania>
            </div>
          )}
          {abierto === 'inflacion' && (
            <div className="mb-10">
              <Pestania nombre="Inflación">
                <InflacionTab />
              </Pestania>
            </div>
          )}
          {abierto === 'monedas' && (
            <Pestania nombre="Divisas y Metales">
              <OtrasMonedasTab />
            </Pestania>
          )}
          {abierto === 'treasuries' && (
            <Pestania nombre="Tasas EEUU">
              <TreasuriesTab />
            </Pestania>
          )}
        </Suspense>
      </div>
    </section>
  )
}
