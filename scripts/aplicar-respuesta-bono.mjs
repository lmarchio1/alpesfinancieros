// Procesa la respuesta del usuario a un aviso de bono nuevo. Llega por dos caminos:
// - respondiendo el mail (queda como comentario del aviso): respuesta-bono-nuevo.yml
// - tocando ✅ Agregar / ❌ Descartar en el mail, que abre un formulario: formulario-bono.yml
// Solo decide y deja todo listo: edita bondsReference.js o bonos-ignorados.json si
// corresponde, y escribe el mensaje de respuesta y el de commit en archivos. Commitear,
// publicar y contestar lo hace el workflow, para que el "agregado" solo salga si el push
// funcionó.
//
// Entrada (variables de entorno): ISSUE_BODY y COMENTARIO (camino del mail), o
// FORMULARIO=1 con ISSUE_BODY = el formulario enviado (y GITHUB_TOKEN, GITHUB_REPOSITORY
// para buscar el aviso). GITHUB_OUTPUT la pone Actions.
// Lo que escribe el usuario se trata como dato y nunca se ejecuta.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { CATEGORIAS, leerMarca } from './clasificacion-bonos.mjs'

const ARCHIVO_MAPAS = new URL('../src/data/bondsReference.js', import.meta.url)
const ARCHIVO_IGNORADOS = new URL('./bonos-ignorados.json', import.meta.url)
const ARCHIVO_MENSAJE = new URL('../respuesta-bono.md', import.meta.url)
const ARCHIVO_COMMIT = new URL('../commit-bono.txt', import.meta.url)
const ARCHIVO_CONFIRMACION = new URL('../confirmacion-bono.md', import.meta.url)

let numeroAviso = ''

// confirmar: 'real' = el workflow verifica que el bono esté en el sitio publicado y
// recién ahí manda la confirmación; 'prueba' = la manda sin verificar (bono ficticio).
function salida(accion, mensaje, { cerrar = false, commit = '', confirmar = '', confirmacion = '', ticker = '', fecha = '' } = {}) {
  writeFileSync(ARCHIVO_MENSAJE, mensaje)
  writeFileSync(ARCHIVO_COMMIT, commit)
  writeFileSync(ARCHIVO_CONFIRMACION, confirmacion)
  const lineas = `accion=${accion}\ncerrar=${cerrar}\naviso=${numeroAviso}\nconfirmar=${confirmar}\nticker=${ticker}\nfecha=${fecha}\n`
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lineas)
  console.log(lineas + mensaje)
}

async function github(ruta) {
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${ruta}`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error(`GitHub GET ${ruta}: ${res.status}`)
  return res.json()
}

// De un mail respondido importa la primera línea escrita por la persona: se saltean las
// líneas vacías y las citadas ("> ..."), y se ignoran comillas invertidas si copió el
// formato tal cual del mail.
function primeraLinea(texto) {
  const linea = (texto ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('>'))
  return (linea ?? '').replaceAll('`', '').trim().toLowerCase()
}

// El formulario llega como markdown: "### <título del campo>" y abajo lo que se escribió.
function campoDelFormulario(cuerpo, titulo) {
  return new RegExp(`### ${titulo}[ \\t]*\\r?\\n+[ \\t]*([^\\r\\n]*)`).exec(cuerpo ?? '')?.[1]?.trim()
}

async function leerEntrada() {
  if (process.env.FORMULARIO !== '1') {
    numeroAviso = /^\d+$/.test(process.env.ISSUE_NUMBER ?? '') ? process.env.ISSUE_NUMBER : ''
    return { modo: 'mail', bono: leerMarca(process.env.ISSUE_BODY), texto: primeraLinea(process.env.COMENTARIO) }
  }
  const cuerpo = process.env.ISSUE_BODY
  const ticker = (campoDelFormulario(cuerpo, 'Ticker del bono avisado') ?? '').toUpperCase()
  const fecha = campoDelFormulario(cuerpo, 'Fecha de vencimiento')
  // El formulario de descartar no tiene campo de fecha.
  const texto = fecha === undefined ? 'no' : `agregar ${fecha}`.toLowerCase()
  if (!/^[A-Z0-9]{3,8}$/.test(ticker)) return { modo: 'formulario', bono: null, texto }

  // El bono y su categoría salen del aviso que abrió el detector, no de lo que se
  // escribió en el formulario: si no hay un aviso abierto para ese ticker, no se hace nada.
  const avisos = await github('/issues?labels=bono-nuevo&state=open&per_page=100')
  const aviso = avisos.find((i) => i.user?.login === 'github-actions[bot]' && leerMarca(i.body)?.clave === ticker)
  if (aviso) numeroAviso = String(aviso.number)
  return { modo: 'formulario', bono: aviso ? leerMarca(aviso.body) : null, texto }
}

function fechaValida(d, m, a) {
  const f = new Date(Date.UTC(a, m - 1, d))
  const esReal = f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d
  const hoy = new Date(new Date().toISOString().slice(0, 10))
  return esReal && f > hoy && a < 2100 ? f.toISOString().slice(0, 10) : null
}

function insertarEnMapa(fuente, mapa, linea) {
  const inicio = fuente.indexOf(`export const ${mapa} = {`)
  const cierre = fuente.indexOf('\n}', inicio)
  if (inicio === -1 || cierre === -1) throw new Error(`No encontré ${mapa} en bondsReference.js`)
  return `${fuente.slice(0, cierre)}\n${linea}${fuente.slice(cierre)}`
}

async function main() {
  const { modo, bono, texto } = await leerEntrada()
  const porMail = modo === 'mail'
  const volverAIntentar = porMail
    ? 'Respondé `agregar dd/mm/aaaa` con el vencimiento correcto.'
    : 'Volvé a tocar ✅ Agregar en el mail y escribí la fecha así: 15/12/2029.'

  if (!bono) {
    return salida('nada', porMail
      ? 'Este aviso no tiene los datos del bono, así que no puedo aplicar nada. Avisale a Claude.'
      : 'No encontré un aviso abierto para ese ticker, así que no cambié nada. Usá los botones del mail del bono que querés agregar o descartar.')
  }

  const { clave, categoria, prueba } = bono
  const cat = CATEGORIAS[categoria]
  const agregar = /^(?:agregar|agregá|agrega|si|sí)\s+(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/.exec(texto)
  const descartar = /^(?:no|dual|descartar|descartá)\b/.test(texto)

  if (descartar) {
    if (prueba) return salida('nada', `Prueba OK ✅ Recibí el descarte: con un bono real, ${clave} habría quedado descartado. No se tocó nada.`, { cerrar: true })
    const ignorados = JSON.parse(readFileSync(ARCHIVO_IGNORADOS, 'utf8'))
    if (!ignorados.some((i) => i.ticker === clave)) {
      ignorados.push({ ticker: clave, motivo: 'descartado por el usuario desde el aviso', fecha: new Date().toISOString().slice(0, 10) })
      writeFileSync(ARCHIVO_IGNORADOS, `[\n${ignorados.map((i) => `  ${JSON.stringify(i)}`).join(',\n')}\n]\n`)
    }
    return salida('descartado', `Listo, descarté ${clave}. No te lo vuelvo a avisar.`, {
      cerrar: true,
      commit: `Descartar ${clave} de los avisos de bonos nuevos\n\nRespuesta del usuario al aviso automático.`,
    })
  }

  if (!agregar) {
    return salida('nada', porMail
      ? [
          'No entendí la respuesta, así que no cambié nada. Respondé con una sola línea, por ejemplo:',
          '',
          '- `agregar 15/12/2029` para sumarlo con esa fecha de vencimiento',
          '- `no` para descartarlo',
        ].join('\n')
      : `No entendí la fecha que escribiste, así que no cambié nada. ${volverAIntentar}`)
  }

  if (cat.manual) {
    return salida('nada', `Los bonos de la solapa ${cat.etiqueta} necesitan además la duración, así que no los puedo agregar solo con la fecha. Avisale a Claude, o descartalo si no va.`)
  }

  const [, d, m, a] = agregar
  const fecha = fechaValida(Number(d), Number(m), Number(a))
  if (!fecha) return salida('nada', `La fecha ${d}/${m}/${a} no existe o ya pasó, así que no cambié nada. ${volverAIntentar}`)

  const [aa, mm, dd] = fecha.split('-')
  const confirmacion = `Ya está publicado ✅ ${clave} aparece en la solapa ${cat.etiqueta} de alpesestadosfinancieros.com.ar, con vencimiento ${dd}/${mm}/${aa}.`

  if (prueba) {
    return salida('nada', `Prueba OK ✅ Recibí el alta: con un bono real, ahora estaría sumando ${clave} a la solapa ${cat.etiqueta} con vencimiento ${dd}/${mm}/${aa}. En un momento te llega un segundo aviso, que es el que confirma que ya está en el sitio.`, {
      confirmar: 'prueba',
      confirmacion: `Prueba OK ✅ Así te va a llegar la confirmación final con un bono real (no se tocó el sitio):\n\n> ${confirmacion}`,
    })
  }

  const mapas = await import(ARCHIVO_MAPAS.href)
  if (clave in mapas[cat.mapa]) {
    return salida('nada', `${clave} ya estaba en la solapa ${cat.etiqueta}, no hacía falta agregarlo.`, { cerrar: true })
  }

  const extra = Object.entries(cat.extra ?? {}).map(([k, v]) => `, ${k}: '${v}'`).join('')
  const linea = `  ${clave}: { vencimiento: '${fecha}'${extra} }, // agregado desde el aviso automático`
  writeFileSync(ARCHIVO_MAPAS, insertarEnMapa(readFileSync(ARCHIVO_MAPAS, 'utf8'), cat.mapa, linea))

  // Verificación: el archivo editado se sigue pudiendo cargar y tiene el bono nuevo.
  const verificado = await import(`${ARCHIVO_MAPAS.href}?v=${Date.now()}`)
  if (verificado[cat.mapa]?.[clave]?.vencimiento !== fecha) throw new Error('La edición de bondsReference.js no quedó bien')

  return salida('agregado', `Recibido ✅ Estoy sumando ${clave} a la solapa ${cat.etiqueta} con vencimiento ${dd}/${mm}/${aa} y publicando el sitio. Te llega otro aviso apenas esté en línea (tarda unos minutos).`, {
    commit: `Agregar ${clave} a ${cat.etiqueta} (vence ${fecha})\n\nRespuesta del usuario al aviso automático de bono nuevo.`,
    confirmar: 'real',
    confirmacion,
    ticker: clave,
    fecha,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
