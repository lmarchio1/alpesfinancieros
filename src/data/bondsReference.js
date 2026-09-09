// Los Globales (ley NY, prefijo GD) y Bonares (ley Arg, prefijo AL/AE) de la
// reingeniería 2020 comparten el mismo esquema de vencimientos: alcanza con
// saber a qué año vence un ticker para completar su vencimiento y duración
// aproximada. Esto permite que bondsLiveApi.js detecte automáticamente
// cualquier serie nueva que aparezca en data912.com (por ejemplo, si faltara
// AE38) sin tener que hardcodear cada ticker a mano.
//
// Si en el futuro se emite una serie con un año de vencimiento que no está
// en este mapa, alcanza con sumar una línea acá — no hace falta tocar la
// lógica de bondsLiveApi.js.
export const MATURITY_BY_YEAR = {
  29: { vencimiento: '2029-07-09', duracionAnios: 2.5 },
  30: { vencimiento: '2030-07-09', duracionAnios: 3.2 },
  35: { vencimiento: '2035-07-09', duracionAnios: 5.9 },
  38: { vencimiento: '2038-01-09', duracionAnios: 7.1 },
  41: { vencimiento: '2041-07-09', duracionAnios: 7.9 },
  46: { vencimiento: '2046-07-09', duracionAnios: 8.7 },
}

// Bonares "Bonar" emitidos en 2026 (ley Arg), fuera del esquema 2020 de
// MATURITY_BY_YEAR: pagan renta mensual/semestral y devuelven el capital
// íntegro al vencimiento, con fechas propias que no siguen el patrón 9/ene-9/jul.
export const BONARES_NUEVOS_META = {
  AO27: { vencimiento: '2027-10-29', ley: 'ARG', duracionAnios: 1.1 },
  AO28: { vencimiento: '2028-10-31', ley: 'ARG', duracionAnios: 1.9 },
  AO29: { vencimiento: '2029-10-31', ley: 'ARG', duracionAnios: 2.7 },
  AN29: { vencimiento: '2029-11-30', ley: 'ARG', duracionAnios: 2.8 },
}

// BONCAP: bonos del Tesoro a tasa fija capitalizable, cotizan en pesos
// (data912.com, endpoint arg_bonds). Fechas verificadas en Rava/InvertirOnline/
// Max Capital.
export const BONCAP_META = {
  T15E7: { vencimiento: '2027-01-15' },
  T30A7: { vencimiento: '2027-04-30' },
  T31Y7: { vencimiento: '2027-05-31' },
  T30J7: { vencimiento: '2027-06-30' },
}

// Bonos a tasa TAMAR (BCRA). No incluye TMVE8: es en rigor un dual
// TAMAR/dólar oficial, no una TAMAR pura, y cotiza en una escala de precio
// totalmente distinta a las demás (~$137.000 contra ~$100-120 del resto,
// no son comparables en la misma tabla).
export const TAMAR_META = {
  TMF27: { vencimiento: '2027-02-26' },
  TMF28: { vencimiento: '2028-02-25' },
  TMG27: { vencimiento: '2027-08-31' },
  TMG28: { vencimiento: '2028-08-31' },
  TML27: { vencimiento: '2027-07-30' },
}

// BOPREAL (BCRA, para importadores): ley ARG, se usa la cotización en
// dólares (sufijo D) de cada clase -las "BPO*" sin sufijo son el mismo bono
// cotizado en pesos, verificado por la relación de precios (~1500x)-.
export const BOPREAL_META = {
  BPA7D: { vencimiento: '2027-10-31', ley: 'ARG' },
  BPB7D: { vencimiento: '2027-10-31', ley: 'ARG' },
  BPC7D: { vencimiento: '2027-10-31', ley: 'ARG' },
  BPD7D: { vencimiento: '2027-10-31', ley: 'ARG' },
  BPA8D: { vencimiento: '2028-10-31', ley: 'ARG' },
  BPB8D: { vencimiento: '2028-10-31', ley: 'ARG' },
}

// Boncer de plazo largo (familia TZX, ajustados por CER), más TX26/TX28/TX31
// (misma lógica de ajuste por CER, viven en arg_bonds igual que el resto de
// este grupo). No incluye TZX7D: es la cotización en dólares del mismo TZX27
// (mismo vencimiento, otra escala de precio), no una serie distinta.
export const BONCER_META = {
  TZXO6: { vencimiento: '2026-10-30' },
  TZXD6: { vencimiento: '2026-12-15' },
  TX26: { vencimiento: '2026-11-09' },
  TZXM7: { vencimiento: '2027-03-31' },
  TZXA7: { vencimiento: '2027-04-30' },
  TZXY7: { vencimiento: '2027-05-31' },
  TZX27: { vencimiento: '2027-06-30' },
  TZXS7: { vencimiento: '2027-09-30' },
  TZXO7: { vencimiento: '2027-10-29' },
  TZXD7: { vencimiento: '2027-12-15' },
  TZXM8: { vencimiento: '2028-03-31' },
  TZX28: { vencimiento: '2028-06-30' },
  TX28: { vencimiento: '2028-11-09' },
  TZXS8: { vencimiento: '2028-09-29' },
  TZXD8: { vencimiento: '2028-12-15' },
  TZXM9: { vencimiento: '2029-03-28' },
  TX31: { vencimiento: '2031-11-30' },
}

// Pago final pactado de cada letra/bono capitalizable de tasa fija ("vpv"): lo que
// paga el título al vencimiento por cada 100 de valor nominal. Es una constante del
// instrumento, fijada en la licitación, y es contra lo que se compara el precio de
// mercado en vivo para calcular el retorno (ver retornoLetra en utils/bondMath.js).
//
// Se guarda acá porque argentinadatos dejó de publicarlo: su endpoint /letras -que
// además no figura en la documentación de la API, así que nunca prometieron
// mantenerlo- pasó a devolver solo precio y tasas de mercado. Hoy el valor se puede
// reconstruir invirtiendo esas tasas, pero eso depende de que ellos sigan
// calculándolas igual. Teniéndolo acá, el sitio deja de depender de eso.
//
// Los marcados como "verificado" se contrastaron contra un snapshot real del formato
// viejo (Wayback, 29/05/2026), que todavía traía el vpv publicado: coinciden con
// diferencia 0,00%. El resto son LECAP de la serie S reconstruidas con el mismo
// método ya validado.
//
// NO incluir acá instrumentos atados a TAMAR o similares (TTS26, TTD26, TY30P): su
// pago final NO es fijo, depende de la tasa que se vaya devengando, y congelarlo sería
// un error. Esos siguen resolviéndose con el valor que devuelve la API en el momento.
//
// Cuando salga una letra nueva, alcanza con sumar una línea acá; si falta, el sitio
// igual la resuelve reconstruyéndola desde la API.
export const PAGO_FINAL_LETRAS = {
  S15S6: 107.2104,
  S30S6: 117.536, // verificado
  S16O6: 105.2803,
  S30O6: 135.278, // verificado
  S13N6: 109.6507,
  S30N6: 129.888, // verificado
  T15E7: 161.104, // verificado
  S29E7: 111.6814,
  T30A7: 157.341, // verificado
  T30J7: 156.037, // verificado
}
