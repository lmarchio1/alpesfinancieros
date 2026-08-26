// Reintenta una función async ante fallas transitorias (comunes en las APIs
// públicas gratuitas que usa el sitio, ej. data912.com, argentinadatos.com).
export async function fetchConReintento(fn, intentos = 2, esperaMs = 800) {
  let ultimoError
  for (let i = 0; i <= intentos; i++) {
    try {
      return await fn()
    } catch (err) {
      ultimoError = err
      if (i < intentos) await new Promise((resolve) => setTimeout(resolve, esperaMs))
    }
  }
  throw ultimoError
}
