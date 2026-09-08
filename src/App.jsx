import Header from './components/Header'
import Hero from './components/Hero'
import WealthManagement from './components/WealthManagement'
import Cotizaciones from './components/Cotizaciones'
import ContactForm from './components/ContactForm'
import Footer from './components/Footer'
import ErrorBoundary from './components/ui/ErrorBoundary'

// Cada sección va envuelta por separado -y no una sola vez alrededor de todo- para que
// una excepción quede contenida en su sección: si se cae Cotizaciones (la parte que
// depende de APIs externas, la más expuesta a datos inesperados), el resto del sitio
// -presentación, gestión patrimonial, contacto- sigue funcionando igual.
function App() {
  return (
    <div className="min-h-screen bg-white">
      <ErrorBoundary seccion="Header">
        <Header />
      </ErrorBoundary>
      <main>
        <ErrorBoundary seccion="Hero">
          <Hero />
        </ErrorBoundary>
        <ErrorBoundary seccion="WealthManagement">
          <WealthManagement />
        </ErrorBoundary>
        <ErrorBoundary seccion="Cotizaciones">
          <Cotizaciones />
        </ErrorBoundary>
        <ErrorBoundary seccion="ContactForm">
          <ContactForm />
        </ErrorBoundary>
      </main>
      <ErrorBoundary seccion="Footer">
        <Footer />
      </ErrorBoundary>
    </div>
  )
}

export default App
