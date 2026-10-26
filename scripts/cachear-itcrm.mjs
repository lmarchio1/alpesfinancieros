// Corre en la tarea de cierre diario (ver .github/workflows/cierre-diario.yml): baja del
// BCRA el Índice de Tipo de Cambio Real Multilateral (ITCRM) y guarda en Supabase dos filas:
//   - itcrm: el último dato y las referencias que muestra la tarjeta (unas pocas líneas).
//   - itcrm_historia: los últimos 10 años día por día (~100 KB, unos 15 KB comprimidos), que
//     se bajan recién cuando alguien abre el gráfico.
//
// El BCRA no lo publica en su API: solo como un Excel de ~3,7 MB, que además el navegador
// no puede leer (no tiene permiso CORS). Un .xlsx es un zip con XML adentro, así que se
// lee con zlib, que ya viene con Node, sin sumar ninguna librería.
//
// El BCRA no lo actualiza todos los días y avisa que los últimos datos son provisorios
// (usan inflación estimada y se corrigen cuando sale la oficial). Por eso se guarda la
// fecha del último dato y la tarjeta la muestra.
//
// Si el archivo viene roto, viejo o con otro formato, no se pisa lo guardado.
//
// Prueba local sin tocar Supabase: DRY_RUN=1 node scripts/cachear-itcrm.mjs
// (con SALIDA=public/itcrm-dev.json escribe el resultado para verlo en localhost, y con
// ARCHIVO=ruta.xlsx lee un Excel local en vez de bajarlo: sirve para probar archivos rotos).
import { inflateRawSync } from 'node:zlib'

const URL_ITCRM = 'https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/ITCRMSerie.xlsx'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DRY_RUN = process.env.DRY_RUN === '1'
// Diez años, para el rango más largo del gráfico.
const DIAS_DE_HISTORIA = 10 * 365 + 3
// Diez años de días hábiles son ~2.600: menos que esto es señal de archivo roto.
const MINIMO_ESPERADO = 2000
// Si el último dato tiene más de dos meses, el archivo dejó de actualizarse o cambió.
const ATRASO_MAXIMO_DIAS = 60
// Rango posible del índice (base 100 en 2015; mínimo histórico ~66 en 2001, máximo ~208 en
// 2002). Un valor fuera de esto no es el ITCRM: o se corrió una columna o vino basura.
const VALOR_MINIMO = 20
const VALOR_MAXIMO = 500
// El BCRA tarda ~25 s en contestar en un día malo; sin límite, la tarea podía quedar colgada.
const ESPERA_MAXIMA_MS = 90 * 1000

if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

// Lector mínimo de zip: el índice está al final del archivo (directorio central) y dice
// dónde empieza cada parte. Solo hace falta leer dos partes del Excel.
function abrirZip(buf) {
  try {
    return abrirZipSinControl(buf)
  } catch (err) {
    if (err instanceof RangeError) throw new Error('El archivo del BCRA vino incompleto o dañado')
    throw err
  }
}

function abrirZipSinControl(buf) {
  let fin = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      fin = i
      break
    }
  }
  if (fin < 0) throw new Error('El archivo del BCRA no es un Excel válido')
  const partes = new Map()
  let p = buf.readUInt32LE(fin + 16)
  for (let n = buf.readUInt16LE(fin + 10); n > 0; n--) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('El índice del Excel del BCRA está dañado')
    const largoNombre = buf.readUInt16LE(p + 28)
    partes.set(buf.toString('utf8', p + 46, p + 46 + largoNombre), {
      metodo: buf.readUInt16LE(p + 10),
      comprimido: buf.readUInt32LE(p + 20),
      local: buf.readUInt32LE(p + 42),
    })
    p += 46 + largoNombre + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32)
  }
  return (nombre) => {
    const parte = partes.get(nombre)
    if (!parte) return null
    try {
      const inicio = parte.local + 30 + buf.readUInt16LE(parte.local + 26) + buf.readUInt16LE(parte.local + 28)
      const datos = buf.subarray(inicio, inicio + parte.comprimido)
      return (parte.metodo === 0 ? datos : inflateRawSync(datos)).toString('utf8')
    } catch {
      throw new Error(`El Excel del BCRA vino dañado (no se pudo leer ${nombre})`)
    }
  }
}

// Fecha de Excel (días desde el 30/12/1899) a AAAA-MM-DD.
const fechaDeExcel = (serie) => new Date(Date.UTC(1899, 11, 30) + Math.round(serie) * 86400000).toISOString().slice(0, 10)
const esFinDeSemana = (iso) => [0, 6].includes(new Date(`${iso}T00:00:00Z`).getUTCDay())
const restarDias = (iso, dias) => new Date(Date.parse(`${iso}T00:00:00Z`) - dias * 86400000).toISOString().slice(0, 10)

// Textos compartidos del Excel (los títulos de las columnas viven acá, no en la hoja).
function leerTextos(xml) {
  if (!xml) return []
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([, si]) =>
    [...si.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map(([, t]) => t).join('').trim(),
  )
}

function celdasDeFila(fila, textos) {
  const celdas = {}
  for (const [, columna, atributos, contenido] of fila.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const crudo = /<v>([^<]*)<\/v>/.exec(contenido ?? '')?.[1]
    if (crudo === undefined) continue
    celdas[columna] = /t="s"/.test(atributos) ? (textos[Number(crudo)] ?? '') : /t="(str|inlineStr)"/.test(atributos) ? crudo : Number(crudo)
  }
  return celdas
}

// Primera hoja ("ITCRM y bilaterales"). Las columnas se buscan por su título y no por
// posición: si el BCRA agrega, saca o reordena columnas (hoy A = "Período", B = "ITCRM",
// y después los bilaterales "ITCRB ..."), se sigue leyendo la correcta, y si el título
// desaparece la tarea falla en vez de guardar otra serie sin darse cuenta.
function leerSerie(xml, textos) {
  const filas = [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map(([, fila]) => celdasDeFila(fila, textos))
  const titulos = filas.find((celdas) => Object.values(celdas).some((v) => typeof v === 'string' && v.trim() === 'ITCRM'))
  if (!titulos) throw new Error('El Excel del BCRA cambió de formato: no se encontró la columna "ITCRM".')
  const columnaIndice = Object.keys(titulos).find((c) => String(titulos[c]).trim() === 'ITCRM')
  const columnaFecha = Object.keys(titulos).find((c) => /^per[ií]odo$/i.test(String(titulos[c]).trim())) ?? 'A'

  const hoy = new Date().toISOString().slice(0, 10)
  const dias = []
  let fueraDeRango = 0
  for (const celdas of filas) {
    const serie = celdas[columnaFecha]
    const valor = celdas[columnaIndice]
    if (typeof serie !== 'number' || typeof valor !== 'number' || !Number.isFinite(serie) || !Number.isFinite(valor)) continue
    const fecha = fechaDeExcel(serie)
    // Fechas imposibles (antes de la serie o en el futuro) se descartan.
    if (fecha < '1990-01-01' || fecha > hoy) continue
    if (valor < VALOR_MINIMO || valor > VALOR_MAXIMO) {
      fueraDeRango++
      continue
    }
    // Sábados y domingos repiten el viernes: se dejan afuera.
    if (!esFinDeSemana(fecha)) dias.push({ fecha, valor: Number(valor.toFixed(2)) })
  }
  // Algún valor raro suelto se tolera; muchos quieren decir que la columna no es la que era.
  if (fueraDeRango > 20) throw new Error(`El Excel del BCRA trae ${fueraDeRango} valores fuera de rango: no se pisa lo guardado.`)

  // Sin fechas repetidas, de la más vieja a la más nueva.
  const porFecha = new Map(dias.map((d) => [d.fecha, d]))
  return [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// El dato más cercano a una fecha, sin pasarse.
function datoAl(dias, fechaIso) {
  let elegido = null
  for (const d of dias) {
    if (d.fecha > fechaIso) break
    elegido = d
  }
  return elegido
}

async function main() {
  let contenido
  let publicado = null
  if (process.env.ARCHIVO) {
    const { readFileSync } = await import('node:fs')
    contenido = readFileSync(process.env.ARCHIVO)
  } else {
    const res = await fetch(URL_ITCRM, { signal: AbortSignal.timeout(ESPERA_MAXIMA_MS) })
    if (!res.ok) throw new Error(`El BCRA respondió ${res.status}`)
    contenido = Buffer.from(await res.arrayBuffer())
    publicado = res.headers.get('last-modified')
  }
  const leer = abrirZip(contenido)
  const hoja = leer('xl/worksheets/sheet1.xml')
  if (!hoja) throw new Error('El Excel del BCRA no trae la hoja esperada')
  const dias = leerSerie(hoja, leerTextos(leer('xl/sharedStrings.xml')))

  const ultimo = dias.at(-1)
  if (!ultimo) throw new Error('El Excel del BCRA vino sin datos')
  const hoy = new Date().toISOString().slice(0, 10)
  if (ultimo.fecha < restarDias(hoy, ATRASO_MAXIMO_DIAS)) {
    throw new Error(`El último dato es del ${ultimo.fecha}: no se pisa lo que ya está guardado.`)
  }
  const puntos = dias.filter((d) => d.fecha >= restarDias(ultimo.fecha, DIAS_DE_HISTORIA))
  if (puntos.length < MINIMO_ESPERADO) {
    throw new Error(`La historia vino con ${puntos.length} días: no se pisa lo que ya está guardado.`)
  }

  const minimo = dias.reduce((a, b) => (b.valor < a.valor ? b : a))
  const maximo = dias.reduce((a, b) => (b.valor > a.valor ? b : a))
  const resumen = {
    ultimo,
    haceUnMes: datoAl(dias, restarDias(ultimo.fecha, 30)),
    haceUnAnio: datoAl(dias, restarDias(ultimo.fecha, 365)),
    promedioHistorico: Number((dias.reduce((s, d) => s + d.valor, 0) / dias.length).toFixed(2)),
    minimo,
    maximo,
    desde: dias[0].fecha,
    publicado,
  }
  const texto = `ITCRM: ${puntos.length} días, del ${puntos[0].fecha} al ${ultimo.fecha} (último ${ultimo.valor}; promedio desde ${dias[0].fecha.slice(0, 4)}: ${resumen.promedioHistorico}).`

  if (DRY_RUN) {
    console.log(`[prueba, no se guardó nada] ${texto}`)
    if (process.env.SALIDA) {
      const { writeFileSync } = await import('node:fs')
      writeFileSync(process.env.SALIDA, JSON.stringify({ resumen, puntos }))
    }
    return
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const actualizado_en = new Date().toISOString()
  const { error } = await supabase.from('precios_cache').upsert(
    [
      { fuente: 'itcrm', datos: resumen, actualizado_en },
      { fuente: 'itcrm_historia', datos: { puntos }, actualizado_en },
    ],
    { onConflict: 'fuente' },
  )
  if (error) throw new Error(`Error al guardar en Supabase: ${error.message}`)
  console.log(texto)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
