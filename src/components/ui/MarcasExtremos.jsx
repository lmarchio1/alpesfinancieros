// Máximo y mínimo sobre los gráficos de Reservas e Inflación, con el mismo estilo que los
// de HistoriaModal: anillo blanco con borde de color, centrado sobre la línea, y el valor
// escrito al lado en el mismo color.
//
// Van como una capa HTML encima del SVG, posicionada en porcentajes, y no dentro del
// dibujo: esos gráficos se estiran para llenar su caja (preserveAspectRatio="none"), y
// adentro del SVG un círculo saldría ovalado y el texto deformado.
//
// extremos: [{ x, y, texto, tono: 'verde' | 'rojo', arriba }], con x e y en % de la caja.
// limiteSuperior / limiteInferior: % donde empieza y termina el área del gráfico; si el
// valor no entra de su lado (se pisaría con el borde o con el eje), pasa al otro lado.
// limiteIzquierdo / limiteDerecho: lo mismo a los costados; el valor nunca se sale del
// área del gráfico (sin esto, un mínimo pegado al borde pisaba los números del eje).
// oculto: mientras se recorre el gráfico, los valores se ocultan para no competir con el
// recuadro del día (los anillos quedan).

const TONOS = {
  verde: { anillo: 'border-emerald-600', texto: 'text-emerald-700' },
  rojo: { anillo: 'border-rose-600', texto: 'text-rose-700' },
}

// Alto aproximado del rótulo más su separación, en % de la caja (~24 px en 256-288 px).
const ESPACIO_ROTULO = 10

export default function MarcasExtremos({
  extremos,
  limiteSuperior = 0,
  limiteInferior = 100,
  limiteIzquierdo = 0,
  limiteDerecho = 100,
  oculto = false,
}) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {extremos.map(({ x, y, texto, tono, arriba }) => {
        const { anillo, texto: claseTexto } = TONOS[tono]
        const vaArriba = arriba ? y - ESPACIO_ROTULO >= limiteSuperior : y + ESPACIO_ROTULO > limiteInferior
        // Dónde cae el punto dentro del área del gráfico, de 0 (borde izquierdo) a 100.
        const enArea = Math.min(100, Math.max(0, ((x - limiteIzquierdo) / (limiteDerecho - limiteIzquierdo || 1)) * 100))
        return (
          <div key={texto}>
            <span
              className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white shadow-sm ${anillo}`}
              style={{ left: `${x}%`, top: `${y}%` }}
            />
            {!oculto && (
              <span
                className={`absolute whitespace-nowrap text-[11px] font-semibold tabular-nums [text-shadow:0_0_3px_#fff,0_0_3px_#fff,0_0_3px_#fff] ${claseTexto}`}
                // El rótulo se corre según dónde cae el punto en el área del gráfico: en
                // el borde izquierdo arranca en el punto, en el derecho termina en él, y en
                // el medio queda centrado. Así nunca se mete sobre los ejes.
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-${enArea}%, ${vaArriba ? 'calc(-100% - 8px)' : '8px'})`,
                }}
              >
                {texto}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
