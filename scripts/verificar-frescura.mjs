// Último paso de la tarea de cierre diario (ver .github/workflows/cierre-diario.yml): revisa
// que cada dato guardado en Supabase esté al día y, si alguno lleva más tiempo del normal
// sin actualizarse, termina en error para que la corrida quede en rojo y llegue el mail.
//
// Hace falta porque los pasos que guardan las historias no frenan la tarea si fallan (a
// propósito, para no perder el cierre), y porque una fuente puede dejar de actualizarse sin
// que nada falle: en noviembre de 2026 el BCRA cambió de lugar el archivo del tipo de
// cambio real, el viejo siguió respondiendo con datos de un mes atrás y nadie se enteró.
//
// Se mira la fecha DEL DATO, no la de la última vez que se guardó la fila: en ese caso la
// fila se reescribía todas las noches con el mismo dato viejo.
//
// Solo lee. Prueba local: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=<clave publicable> node
// scripts/verificar-frescura.mjs (con HOY=AAAA-MM-DD se simula otra fecha).

const SUPABASE_URL = process.env.SUPABASE_URL
const CLAVE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !CLAVE) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const ultimoPunto = (d) => d?.puntos?.at(-1)?.fecha

// Cuántos días puede tener el último dato de cada fuente antes de avisar. Son días
// corridos: tienen que cubrir un fin de semana largo más la demora normal de cada fuente,
// sin llegar a esconder un problema real.
const CONTROLES = [
  { fuente: 'itcrm', nombre: 'Tipo de cambio real (BCRA)', fecha: (d) => d?.ultimo?.fecha, maxDias: 10 },
  { fuente: 'itcrm_historia', nombre: 'Tipo de cambio real, historia', fecha: ultimoPunto, maxDias: 10 },
  { fuente: 'fed_tasa', nombre: 'Tasa de la Fed', fecha: (d) => d?.ultimo?.fecha, maxDias: 7 },
  { fuente: 'fed_historia', nombre: 'Tasa de la Fed, historia', fecha: ultimoPunto, maxDias: 7 },
  { fuente: 'dxy_historia', nombre: 'Índice dólar, historia', fecha: ultimoPunto, maxDias: 7 },
  { fuente: 'riesgo_pais_historia', nombre: 'Riesgo país, historia', fecha: ultimoPunto, maxDias: 7 },
  { fuente: 'treasury_curva', nombre: 'Curva del Tesoro de EE.UU.', fecha: (d) => d?.dias?.at(-1)?.fecha, maxDias: 7 },
  { fuente: 'breakeven_historia', nombre: 'Inflación esperada, historia', fecha: ultimoPunto, maxDias: 7 },
  {
    fuente: 'dolares_implicitos',
    nombre: 'Último MEP y CCL válidos',
    // El más viejo de los dos: alcanza con que uno se quede atrás.
    fecha: (d) => [d?.mep?.fecha, d?.ccl?.fecha].every(Boolean) ? [d.mep.fecha, d.ccl.fecha].sort()[0] : null,
    maxDias: 7,
  },
  // El BCRA publica las reservas con dos o tres días de demora.
  { fuente: 'bcra_variables', nombre: 'Variables del BCRA (reservas)', fecha: (d) => d?.reservas?.fecha, maxDias: 10 },
  // Tarea de cada 5 minutos: acá sí importa cuándo se guardó por última vez.
  { fuente: 'data912_arg_bonds', nombre: 'Precios de bonos (cada 5 minutos)', maxHoras: 3 },
]

const hoy = process.env.HOY ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
const diasDesde = (fechaIso) => Math.round((Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${String(fechaIso).slice(0, 10)}T00:00:00Z`)) / 86400000)

async function consultar(tabla, parametros) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?${parametros}`, {
    headers: { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`Supabase respondió ${res.status} al leer ${tabla}`)
  return res.json()
}

const problemas = []
const filas = await consultar('precios_cache', 'select=fuente,actualizado_en,datos')
const porFuente = new Map(filas.map((f) => [f.fuente, f]))

// Devuelve [está bien, descripción] de cada control.
function revisar(c) {
  const fila = porFuente.get(c.fuente)
  if (!fila) return [false, 'no está guardado']
  if (c.maxHoras) {
    const horas = (Date.now() - Date.parse(fila.actualizado_en)) / 3600000
    const hace = horas < 1 ? `${Math.round(horas * 60)} min` : `${Math.round(horas)} h`
    return [horas <= c.maxHoras, `guardado hace ${hace} (máximo ${c.maxHoras} h)`]
  }
  const fecha = c.fecha(fila.datos)
  if (typeof fecha !== 'string' || Number.isNaN(Date.parse(fecha))) return [false, 'no se pudo leer la fecha de su último dato']
  const dias = diasDesde(fecha)
  return [dias <= c.maxDias, `último dato del ${fecha.slice(0, 10)}, hace ${dias} días (máximo ${c.maxDias})`]
}

for (const c of CONTROLES) {
  const [bien, detalle] = revisar(c)
  console.log(`${bien ? 'ok     ' : 'VENCIDO'}  ${c.nombre}: ${detalle}`)
  if (!bien) problemas.push(`${c.nombre}: ${detalle}`)
}

// El cierre de ayer, que es contra lo que el sitio calcula la variación del día.
const ayer = new Date(`${hoy}T00:00:00Z`)
ayer.setUTCDate(ayer.getUTCDate() - 1)
const fechaAyer = ayer.toISOString().slice(0, 10)
const necesarios = ['oficial_venta', 'mayorista_venta', 'mep_venta', 'ccl_venta', 'riesgo_pais']
const cierres = await consultar('cierres_diarios', `select=instrumento&fecha=eq.${fechaAyer}&instrumento=in.(${necesarios.join(',')})`)
const faltan = necesarios.filter((i) => !cierres.some((c) => c.instrumento === i))
if (faltan.length > 0) {
  console.log(`VENCIDO  Cierre del ${fechaAyer}: falta ${faltan.join(', ')}`)
  problemas.push(`Cierre del ${fechaAyer}: falta ${faltan.join(', ')}`)
} else {
  console.log(`ok       Cierre del ${fechaAyer}: completo`)
}

if (problemas.length > 0) {
  console.error(`\nATENCIÓN: ${problemas.length === 1 ? 'hay un dato' : `hay ${problemas.length} datos`} sin actualizar:`)
  for (const p of problemas) console.error(`  - ${p}`)
  process.exit(1)
}
console.log('\nTodos los datos están al día.')
