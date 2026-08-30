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

// A diferencia de Globales/Bonares, data912.com no expone la fecha de
// vencimiento de los duales (solo ticker y precio), así que no se puede
// auto-detectar una serie nueva de forma confiable: hay que sumarla acá a
// mano. Para revisar si salió una serie nueva, buscar en
// https://data912.com/live/arg_bonds cualquier ticker con prefijo "TT" que
// no termine en "C" o "D" (esos sufijos son variantes de precio del mismo
// ticker, no series distintas) y que no esté ya en este mapa.
export const DUALES_META = {
  TTS26: { vencimiento: '2026-09-15' },
  TTD26: { vencimiento: '2026-12-15' },
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

// LECER: letras del Tesoro ajustadas por CER, cotizan en pesos (data912.com,
// endpoint arg_notes). No están en el listado de "letras" de argentinadatos.com,
// así que se cargan a mano acá -fechas verificadas en Rava/InvertirOnline/
// doctacapital, no inferidas del ticker-.
// X* viven en arg_notes; TX26/TX28/TX31 (Boncer de plazo más corto, misma
// lógica de ajuste por CER) viven en arg_bonds -rentaFijaApi.js pide ambos
// endpoints para armar esta pestaña-. Fechas verificadas en Rava/bonistas.com.
export const LECER_META = {
  X30S6: { vencimiento: '2026-09-30' },
  X30N6: { vencimiento: '2026-11-30' },
  X29E7: { vencimiento: '2027-01-29' },
  TX26: { vencimiento: '2026-11-09' },
  TX28: { vencimiento: '2028-11-09' },
  TX31: { vencimiento: '2031-11-30' },
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

// Dólar Linked: se compran y pagan en pesos, pero siguen la evolución del
// dólar oficial (no confundir con los Duales, que ajustan por dólar o
// inflación según cuál rinda más). No se incluye TZV7D: es la cotización en
// dólares del mismo TZV27 (mismo vencimiento, otra escala de precio ~1500
// veces menor), no una serie distinta.
export const DOLAR_LINKED_META = {
  TZV27: { vencimiento: '2027-06-30' },
  TZV28: { vencimiento: '2028-06-30' },
  TZVD8: { vencimiento: '2028-12-15' },
}

// Bonos a tasa TAMAR (BCRA). TMVE8 es en rigor un dual TAMAR/dólar oficial,
// no una TAMAR pura, pero se agrupa acá igual.
export const TAMAR_META = {
  TMF27: { vencimiento: '2027-02-26' },
  TMF28: { vencimiento: '2028-02-25' },
  TMG27: { vencimiento: '2027-08-31' },
  TMG28: { vencimiento: '2028-08-31' },
  TML27: { vencimiento: '2027-07-30' },
  TMVE8: { vencimiento: '2028-01-31' },
}

// BOPREAL (BCRA, para importadores): se usa la cotización en dólares
// (sufijo D) de cada clase -las "BPO*" sin sufijo son el mismo bono
// cotizado en pesos, verificado por la relación de precios (~1500x)-.
export const BOPREAL_META = {
  BPA7D: { vencimiento: '2027-10-31' },
  BPB7D: { vencimiento: '2027-10-31' },
  BPC7D: { vencimiento: '2027-10-31' },
  BPD7D: { vencimiento: '2027-10-31' },
  BPA8D: { vencimiento: '2028-10-31' },
  BPB8D: { vencimiento: '2028-10-31' },
}

// Boncer de plazo largo (familia TZX, ajustados por CER). No se incluye
// TZX7D: es la cotización en dólares del mismo TZX27, misma lógica que
// TZV7D más arriba.
export const BONCER_META = {
  TZXO6: { vencimiento: '2026-10-30' },
  TZXD6: { vencimiento: '2026-12-15' },
  TZXM7: { vencimiento: '2027-03-31' },
  TZXA7: { vencimiento: '2027-04-30' },
  TZXY7: { vencimiento: '2027-05-31' },
  TZX27: { vencimiento: '2027-06-30' },
  TZXS7: { vencimiento: '2027-09-30' },
  TZXO7: { vencimiento: '2027-10-29' },
  TZXD7: { vencimiento: '2027-12-15' },
  TZXM8: { vencimiento: '2028-03-31' },
  TZX28: { vencimiento: '2028-06-30' },
  TZXS8: { vencimiento: '2028-09-29' },
  TZXD8: { vencimiento: '2028-12-15' },
  TZXM9: { vencimiento: '2029-03-28' },
}
