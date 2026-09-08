import { Component } from 'react'

// Sin esto, una excepción al renderizar CUALQUIER componente deja la página entera en
// blanco -no solo la sección que falló-. No es hipotético: ya pasó en producción con un
// build sin las variables de entorno de Supabase (ver comentario en supabaseClient.js),
// donde una excepción de un servicio tumbaba todo el sitio. Envolviendo cada sección por
// separado, un error queda contenido ahí y el resto de la página sigue en pie.
//
// El fallback es no renderizar nada, siguiendo la convención que ya usa el resto del
// sitio -las tarjetas hacen `return null` cuando les falta el dato, en vez de mostrar un
// cartel de error-: es preferible que falte una sección a que aparezca un mensaje roto
// en una web institucional. El error igual queda en la consola para poder diagnosticarlo.
export default class ErrorBoundary extends Component {
  state = { falló: false }

  static getDerivedStateFromError() {
    return { falló: true }
  }

  componentDidCatch(error, info) {
    console.error('Sección caída:', this.props.seccion ?? 'sin identificar', error, info?.componentStack)
  }

  render() {
    if (this.state.falló) return null
    return this.props.children
  }
}
