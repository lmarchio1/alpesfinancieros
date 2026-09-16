// Detector diario de bonos nuevos (ver .github/workflows/detectar-bonos-nuevos.yml).
// Compara lo que cotiza data912 contra lo que ya muestra el sitio y, por cada bono
// nuevo, abre un aviso (issue) asignado al dueño del repo: GitHub le manda el mail, y
// su respuesta la procesa aplicar-respuesta-bono.mjs.
//
// Variables: GITHUB_TOKEN, GITHUB_REPOSITORY (las pone Actions).
// DRY_RUN=1 solo lista lo que encontraría, sin abrir avisos (para probar en local).
// PRUEBA=1 abre un aviso de prueba con un bono ficticio, para verificar el circuito del
// mail sin tocar el sitio.
import { readFile } from 'node:fs/promises'
import * as mapas from '../src/data/bondsReference.js'
import { CATEGORIAS, detectarNuevos, marca } from './clasificacion-bonos.mjs'

const ETIQUETA = 'bono-nuevo'
const { GITHUB_TOKEN, GITHUB_REPOSITORY, DRY_RUN, PRUEBA } = process.env

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

async function main() {
  let nuevos
  if (PRUEBA === '1') {
    nuevos = [{ clave: 'PRUEBA', categoria: 'BONCER', precio: 100, prueba: true }]
  } else {
    let simbolos
    try {
      const [bonos, letras] = await Promise.all([
        getJson('https://data912.com/live/arg_bonds'),
        getJson('https://data912.com/live/arg_notes'),
      ])
      simbolos = [...bonos, ...letras]
    } catch (err) {
      // Caída pasajera de data912: se reintenta mañana. No se marca el workflow como
      // fallido para no mandar un mail de error por algo que no es del sitio.
      console.warn(`No se pudo leer data912, se reintenta en la próxima corrida: ${err.message}`)
      return
    }
    const ignorados = JSON.parse(await readFile(new URL('./bonos-ignorados.json', import.meta.url), 'utf8'))
    nuevos = detectarNuevos(simbolos, mapas, ignorados)
  }

  if (nuevos.length === 0) {
    console.log('No hay bonos nuevos.')
    return
  }
  console.log('Bonos nuevos:', nuevos.map((b) => `${b.clave} (${b.categoria})`).join(', '))
  if (DRY_RUN === '1') {
    for (const bono of nuevos) console.log(`\n${cuerpoDelAviso(bono)}\n`)
    return
  }

  // Un aviso por bono en toda la historia: si ya se avisó (esté abierto, respondido o
  // cerrado a mano), no se repite.
  const existentes = await github(`/issues?labels=${ETIQUETA}&state=all&per_page=100`)
  const yaAvisados = new Set(existentes.map((i) => /ticker=([A-Z0-9]+)/.exec(i.body ?? '')?.[1]).filter(Boolean))

  // 422 = la etiqueta ya existe.
  await github('/labels', {
    method: 'POST',
    body: { name: ETIQUETA, color: '123a5c', description: 'Bono detectado automáticamente' },
    permitir422: true,
  })
  const [duenio] = GITHUB_REPOSITORY.split('/')

  for (const bono of nuevos) {
    if (yaAvisados.has(bono.clave) && !bono.prueba) continue
    const titulo = `${bono.prueba ? '[PRUEBA] ' : ''}Nuevo bono detectado: ${bono.clave} (${CATEGORIAS[bono.categoria].etiqueta})`
    const aviso = await github('/issues', {
      method: 'POST',
      body: { title: titulo, body: cuerpoDelAviso(bono), labels: [ETIQUETA], assignees: [duenio] },
    })
    console.log(`Aviso abierto: #${aviso.number} ${titulo}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
