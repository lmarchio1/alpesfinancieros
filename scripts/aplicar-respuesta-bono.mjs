// Procesa la respuesta del usuario a un aviso de bono nuevo (ver
// .github/workflows/respuesta-bono-nuevo.yml). Solo decide y deja todo listo: edita
// bondsReference.js o bonos-ignorados.json si corresponde, y escribe el mensaje de
// respuesta y el mensaje de commit en archivos. Commitear, publicar y contestar lo hace
// el workflow, para que el mensaje "agregado" solo salga si el push funcionó.
//
// Entrada (variables de entorno): COMENTARIO, ISSUE_BODY; GITHUB_OUTPUT la pone Actions.
// El comentario es texto que llega de un mail: se trata como dato y nunca se ejecuta.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { CATEGORIAS, leerMarca } from './clasificacion-bonos.mjs'

const ARCHIVO_MAPAS = new URL('../src/data/bondsReference.js', import.meta.url)
const ARCHIVO_IGNORADOS = new URL('./bonos-ignorados.json', import.meta.url)
const ARCHIVO_MENSAJE = new URL('../respuesta-bono.md', import.meta.url)
const ARCHIVO_COMMIT = new URL('../commit-bono.txt', import.meta.url)

function salida(accion, mensaje, { cerrar = false, commit = '' } = {}) {
  writeFileSync(ARCHIVO_MENSAJE, mensaje)
  writeFileSync(ARCHIVO_COMMIT, commit)
  const lineas = `accion=${accion}\ncerrar=${cerrar}\n`
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lineas)
  console.log(lineas + mensaje)
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
  const bono = leerMarca(process.env.ISSUE_BODY)
  if (!bono) return salida('nada', 'Este aviso no tiene los datos del bono, así que no puedo aplicar nada. Avisale a Claude.')

  const { clave, categoria, prueba } = bono
  const cat = CATEGORIAS[categoria]
  const texto = primeraLinea(process.env.COMENTARIO)
  const agregar = /^(?:agregar|agregá|agrega|si|sí)\s+(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/.exec(texto)
  const descartar = /^(?:no|dual|descartar|descartá)\b/.test(texto)

  if (descartar) {
    if (prueba) return salida('nada', `Prueba OK ✅ Recibí tu "no": con un bono real, ${clave} habría quedado descartado. No se tocó nada.`, { cerrar: true })
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
    return salida('nada', [
      'No entendí la respuesta, así que no cambié nada. Respondé con una sola línea, por ejemplo:',
      '',
      '- `agregar 15/12/2029` para sumarlo con esa fecha de vencimiento',
      '- `no` para descartarlo',
    ].join('\n'))
  }

  if (cat.manual) {
    return salida('nada', `Los bonos de la solapa ${cat.etiqueta} necesitan además la duración, así que no los puedo agregar desde el mail. Avisale a Claude, o respondé \`no\` si no va.`)
  }

  const [, d, m, a] = agregar
  const fecha = fechaValida(Number(d), Number(m), Number(a))
  if (!fecha) {
    return salida('nada', `La fecha ${d}/${m}/${a} no es válida o ya pasó, así que no cambié nada. Respondé \`agregar dd/mm/aaaa\` con el vencimiento correcto.`)
  }

  if (prueba) {
    return salida('nada', `Prueba OK ✅ Con un bono real, ${clave} se habría sumado a la solapa ${cat.etiqueta} con vencimiento ${fecha}. No se tocó el sitio.`, { cerrar: true })
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

  const [aa, mm, dd] = fecha.split('-')
  return salida('agregado', `Listo ✅ Sumé ${clave} a la solapa ${cat.etiqueta} con vencimiento ${dd}/${mm}/${aa}. El sitio se está publicando y en unos minutos aparece.`, {
    cerrar: true,
    commit: `Agregar ${clave} a ${cat.etiqueta} (vence ${fecha})\n\nRespuesta del usuario al aviso automático de bono nuevo.`,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
