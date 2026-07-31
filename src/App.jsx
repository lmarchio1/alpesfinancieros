import Header from './components/Header'
import Hero from './components/Hero'
import WealthManagement from './components/WealthManagement'
import Cotizaciones from './components/Cotizaciones'
import ContactForm from './components/ContactForm'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <WealthManagement />
        <Cotizaciones />
        <ContactForm />
      </main>
      <Footer />
    </div>
  )
}

export default App
