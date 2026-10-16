// Detector diario de bonos nuevos (ver .github/workflows/detectar-bonos-nuevos.yml).
// Compara lo que cotiza data912 contra lo que ya muestra el sitio y, por cada bono
// nuevo, abre un aviso (issue) asignado al dueño del repo: GitHub le manda el mail, y
// su respuesta la procesa aplicar-respuesta-bono.mjs.
//
// Además:
// - Si data912 no responde, reintenta dentro de la misma corrida. Si aun así no pudo
//   revisar, lo anota en un aviso "El detector de bonos no pudo revisar"; al segundo día
//   seguido sin datos se lo asigna al dueño, y GitHub le manda el mail. Cuando vuelve a
//   andar, lo dice en ese mismo aviso y lo cierra.
// - Los viernes deja un resumen de la semana en un aviso fijo asignado al dueño, haya
//   novedades o no: si un viernes no llega, es que algo se rompió.
//
// Variables: GITHUB_TOKEN, GITHUB_REPOSITORY (las pone Actions).
// DRY_RUN=1 solo lista lo que encontraría, sin tocar GitHub (para probar en local).
// PRUEBA=1 abre un aviso de prueba con un bono ficticio, para verificar el circuito del
// mail sin tocar el sitio.
// RESUMEN=1 manda el resumen semanal aunque no sea viernes.
// ESPERA_REINTENTO_MS cambia la espera entre reintentos (por defecto 4 minutos).
import { readFile } from 'node:fs/promises'
import * as mapas from '../src/data/bondsReference.js'
import { CATEGORIAS, detectarNuevos, marca } from './clasificacion-bonos.mjs'

const ETIQUETA = 'bono-nuevo'
const ETIQUETA_FALLA = 'detector-sin-datos'
const ETIQUETA_RESUMEN = 'resumen-detector'
const { GITHUB_TOKEN, GITHUB_REPOSITORY, DRY_RUN, PRUEBA, RESUMEN } = process.env

// data912 tiene caídas cortas (el 9/10/2026 respondió 502): tres intentos separados por
// unos minutos cubren la mayoría sin que se pierda el día.
const INTENTOS = 3
const ESPERA_ENTRE_INTENTOS_MS = Number(process.env.ESPERA_REINTENTO_MS ?? 4 * 60 * 1000)
// Un día sin datos no amerita un mail: dos seguidos, sí.
const DIAS_SIN_DATOS_PARA_AVISAR = 2

const duenio = () => GITHUB_REPOSITORY.split('/')[0]
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const hoyArgentina = () =>
  new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit' }).format(new Date())
const diaDeLaSemanaArgentina = () =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short' }).format(new Date())

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`)
  return res.json()
}

async function github(ruta, { method = 'GET', body, permitir422 = false } = {}) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${ruta}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: body && JSON.stringify(body),
  })
  if (!res.ok && !(permitir422 && res.status === 422)) {
    throw new Error(`GitHub ${method} ${ruta}: ${res.status} ${await res.text()}`)
  }
  return res.status === 204 ? null : res.json()
}

const formatoPrecio = (n) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Links a los formularios de .github/ISSUE_TEMPLATE, con el ticker ya completado.
function enlaceFormulario(accion, clave) {
  const params = new URLSearchParams({ template: `${accion}-bono.yml`, title: `${accion === 'agregar' ? 'Agregar' : 'Descartar'} ${clave}`, ticker: clave })
  return `https://github.com/${GITHUB_REPOSITORY}/issues/new?${params}`
}

function cuerpoDelAviso(bono) {
  const { clave, categoria, precio, prueba } = bono
  const etiqueta = CATEGORIAS[categoria].etiqueta
  const intro = prueba
    ? '**Esto es una PRUEBA** del sistema de avisos: el bono es ficticio y responder no cambia nada en el sitio.\n\n'
    : ''
  const descartar = `### [❌ Descartar](${enlaceFormulario('descartar', clave)})`
  const instrucciones = CATEGORIAS[categoria].manual
    ? [
        `Este tipo de bono necesita un dato más que la fecha (la duración, para la calculadora de riesgo país), así que no se puede agregar desde acá. Si va, avisale a Claude. Si no va:`,
        '',
        descartar,
      ].join('\n')
    : [
        '**¿Qué hacemos?**',
        '',
        `### [✅ Agregar](${enlaceFormulario('agregar', clave)})`,
        'Se abre un formulario: escribí la fecha de vencimiento y tocá **Create**.',
        '',
        descartar,
        'Se abre un formulario ya completo: tocá **Create** para confirmar. No te lo vuelvo a avisar.',
        '',
        `También podés responder este mail con una sola línea: \`agregar dd/mm/aaaa\` o \`no\`.`,
        '',
        'Cuando el bono ya esté en el sitio te llega un mail de confirmación.',
      ].join('\n')
  return [
    `${intro}Apareció un bono que tu sitio todavía no muestra:`,
    '',
    `- **Ticker:** ${clave}`,
    `- **Solapa:** ${etiqueta}`,
    `- **Precio hoy:** $ ${formatoPrecio(precio)}`,
    '',
    instrucciones,
    '',
    marca(bono),
  ].join('\n')
}

async function leerData912() {
  let ultimoError
  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      const [bonos, letras] = await Promise.all([
        getJson('https://data912.com/live/arg_bonds'),
        getJson('https://data912.com/live/arg_notes'),
      ])
      return [...bonos, ...letras]
    } catch (err) {
      ultimoError = err
      console.warn(`Intento ${intento}/${INTENTOS} sin datos de data912: ${err.message}`)
      if (intento < INTENTOS) await esperar(ESPERA_ENTRE_INTENTOS_MS)
    }
  }
  throw ultimoError
}

async function crearEtiqueta(nombre, color, descripcion) {
  // 422 = la etiqueta ya existe.
  await github('/labels', { method: 'POST', body: { name: nombre, color, description: descripcion }, permitir422: true })
}

async function avisoAbierto(etiqueta) {
  const abiertos = await github(`/issues?labels=${etiqueta}&state=open&per_page=10`)
  return abiertos.find((i) => i.user?.login === 'github-actions[bot]') ?? null
}

async function abrirAvisos(nuevos) {
  // Un aviso por bono en toda la historia: si ya se avisó (esté abierto, respondido o
  // cerrado a mano), no se repite.
  const existentes = await github(`/issues?labels=${ETIQUETA}&state=all&per_page=100`)
  const yaAvisados = new Set(existentes.map((i) => /ticker=([A-Z0-9]+)/.exec(i.body ?? '')?.[1]).filter(Boolean))
  await crearEtiqueta(ETIQUETA, '123a5c', 'Bono detectado automáticamente')

  for (const bono of nuevos) {
    if (yaAvisados.has(bono.clave) && !bono.prueba) continue
    const titulo = `${bono.prueba ? '[PRUEBA] ' : ''}Nuevo bono detectado: ${bono.clave} (${CATEGORIAS[bono.categoria].etiqueta})`
    const aviso = await github('/issues', {
      method: 'POST',
      body: { title: titulo, body: cuerpoDelAviso(bono), labels: [ETIQUETA], assignees: [duenio()] },
    })
    console.log(`Aviso abierto: #${aviso.number} ${titulo}`)
  }
}

// Día sin datos: se anota en un único aviso abierto. Recién al segundo día seguido se le
// asigna al dueño (y le llega el mail); desde ahí, cada día más le llega como respuesta.
async function registrarFalla(err) {
  const detalle = `${hoyArgentina()}: data912 no respondió después de ${INTENTOS} intentos (${err.message}).`
  if (DRY_RUN === '1') return console.log(`[DRY_RUN] Se anotaría la falla: ${detalle}`)

  await crearEtiqueta(ETIQUETA_FALLA, 'b60205', 'El detector de bonos no pudo leer data912')
  let aviso = await avisoAbierto(ETIQUETA_FALLA)
  if (!aviso) {
    aviso = await github('/issues', {
      method: 'POST',
      body: {
        title: 'El detector de bonos no pudo revisar',
        labels: [ETIQUETA_FALLA],
        body: [
          'El detector no pudo leer las cotizaciones de data912, así que ese día no buscó bonos nuevos.',
          'En la próxima revisión vuelve a mirar todo desde cero, así que no se pierde nada: los bonos no desaparecen.',
          '',
          'Si pasa dos días seguidos te llega un mail. Cuando vuelva a funcionar, se avisa acá y este aviso se cierra solo.',
          '',
          `- ${detalle}`,
        ].join('\n'),
      },
    })
    console.warn(`Falla anotada en el aviso #${aviso.number}`)
  } else {
    await github(`/issues/${aviso.number}/comments`, { method: 'POST', body: { body: `Tampoco pudo revisar hoy. ${detalle}` } })
  }

  const comentarios = await github(`/issues/${aviso.number}/comments?per_page=100`)
  const diasSinDatos = 1 + comentarios.filter((c) => c.user?.login === 'github-actions[bot]').length
  const asignado = (aviso.assignees ?? []).some((a) => a.login === duenio())
  if (diasSinDatos >= DIAS_SIN_DATOS_PARA_AVISAR && !asignado) {
    await github(`/issues/${aviso.number}/assignees`, { method: 'POST', body: { assignees: [duenio()] } })
    console.warn(`${diasSinDatos} días seguidos sin datos: aviso #${aviso.number} asignado al dueño`)
  }
}

async function registrarRecuperacion(cantidad) {
  if (DRY_RUN === '1') return
  const aviso = await avisoAbierto(ETIQUETA_FALLA)
  if (!aviso) return
  await github(`/issues/${aviso.number}/comments`, {
    method: 'POST',
    body: { body: `Volvió a funcionar ✅ ${hoyArgentina()}: revisó ${cantidad} instrumentos de data912.` },
  })
  await github(`/issues/${aviso.number}`, { method: 'PATCH', body: { state: 'closed' } })
  console.log(`Volvió a funcionar: aviso #${aviso.number} cerrado`)
}

// Resumen de los viernes (o del sábado, si GitHub corrió el cron del viernes con mucho
// atraso), en un único aviso fijo: cada resumen llega como un mail nuevo en el mismo hilo.
async function resumenSemanal({ revisados, nuevos }) {
  const tocaHoy = RESUMEN === '1' || ['Fri', 'Sat'].includes(diaDeLaSemanaArgentina())
  if (!tocaHoy) return

  const haceUnaSemana = new Date(Date.now() - 7 * 86400000).toISOString()
  const lineas = []
  if (DRY_RUN !== '1') {
    const avisosDeLaSemana = (await github(`/issues?labels=${ETIQUETA}&state=all&since=${haceUnaSemana}&per_page=100`)).filter(
      (i) => i.created_at >= haceUnaSemana && !i.title.startsWith('[PRUEBA]'),
    )
    lineas.push(
      avisosDeLaSemana.length
        ? `**Bonos nuevos esta semana:** ${avisosDeLaSemana.map((i) => `#${i.number} (${i.title.replace('Nuevo bono detectado: ', '')})`).join(', ')}`
        : '**Bonos nuevos esta semana:** ninguno.',
    )
    const fallas = await github(`/issues?labels=${ETIQUETA_FALLA}&state=all&since=${haceUnaSemana}&per_page=20`)
    let diasSinDatos = 0
    for (const f of fallas) {
      if (f.created_at >= haceUnaSemana) diasSinDatos++
      const comentarios = await github(`/issues/${f.number}/comments?since=${haceUnaSemana}&per_page=100`)
      diasSinDatos += comentarios.filter((c) => c.body.startsWith('Tampoco pudo revisar')).length
    }
    lineas.push(diasSinDatos ? `**Días sin datos de data912:** ${diasSinDatos} (se recuperó solo al día siguiente).` : '**Días sin datos de data912:** ninguno.')
  } else {
    lineas.push(`**Bonos nuevos hoy:** ${nuevos.length ? nuevos.map((b) => b.clave).join(', ') : 'ninguno'}.`)
  }
  lineas.push(
    revisados
      ? `**Revisión de hoy:** ${revisados} instrumentos de data912, todo en orden.`
      : '**Revisión de hoy:** data912 no respondió; se reintenta el lunes.',
  )
  const cuerpo = [`Resumen semanal del detector · ${hoyArgentina()}`, '', ...lineas.map((l) => `- ${l}`)].join('\n')

  if (DRY_RUN === '1') return console.log(`[DRY_RUN] Resumen semanal:\n${cuerpo}`)

  await crearEtiqueta(ETIQUETA_RESUMEN, '0e8a16', 'Resumen semanal del detector de bonos')
  let aviso = await avisoAbierto(ETIQUETA_RESUMEN)
  if (!aviso) {
    aviso = await github('/issues', {
      method: 'POST',
      body: {
        title: 'Resumen semanal del detector de bonos',
        labels: [ETIQUETA_RESUMEN],
        assignees: [duenio()],
        body: [
          'Todos los viernes te llega acá un resumen del detector de bonos nuevos, aunque no haya novedades.',
          '',
          'Si algún viernes no te llega, es señal de que algo dejó de funcionar.',
        ].join('\n'),
      },
    })
    console.log(`Aviso de resumen creado: #${aviso.number}`)
  }
  // Una sola vez por semana aunque la tarea corra dos veces (viernes y sábado, o a mano).
  const comentarios = await github(`/issues/${aviso.number}/comments?since=${new Date(Date.now() - 3 * 86400000).toISOString()}`)
  if (comentarios.some((c) => c.body.startsWith('Resumen semanal del detector')) && RESUMEN !== '1') {
    return console.log('El resumen de esta semana ya estaba enviado.')
  }
  await github(`/issues/${aviso.number}/comments`, { method: 'POST', body: { body: cuerpo } })
  console.log(`Resumen semanal enviado en el aviso #${aviso.number}`)
}

async function main() {
  if (PRUEBA === '1') {
    const prueba = [{ clave: 'PRUEBA', categoria: 'BONCER', precio: 100, prueba: true }]
    if (DRY_RUN === '1') return console.log(cuerpoDelAviso(prueba[0]))
    return abrirAvisos(prueba)
  }

  let simbolos
  try {
    simbolos = await leerData912()
  } catch (err) {
    // No se marca la corrida como fallida: el aviso propio es más claro que el mail
    // genérico de GitHub, y una caída de data912 no es un problema del sitio.
    await registrarFalla(err)
    await resumenSemanal({ revisados: 0, nuevos: [] })
    return
  }

  const ignorados = JSON.parse(await readFile(new URL('./bonos-ignorados.json', import.meta.url), 'utf8'))
  const nuevos = detectarNuevos(simbolos, mapas, ignorados)
  console.log(nuevos.length ? `Bonos nuevos: ${nuevos.map((b) => `${b.clave} (${b.categoria})`).join(', ')}` : 'No hay bonos nuevos.')

  if (DRY_RUN === '1') {
    for (const bono of nuevos) console.log(`\n${cuerpoDelAviso(bono)}\n`)
  } else if (nuevos.length) {
    await abrirAvisos(nuevos)
  }
  await registrarRecuperacion(simbolos.length)
  await resumenSemanal({ revisados: simbolos.length, nuevos })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
