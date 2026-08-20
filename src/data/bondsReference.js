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
