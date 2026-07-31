// Metadata estática (vencimiento, ley, duración aproximada) para Globales,
// Bonares y duales. El precio y la variación se completan en vivo desde
// data912.com en src/services/bondsLiveApi.js — acá solo va lo que no
// cambia día a día.

export const GLOBALES_META = {
  GD29: { vencimiento: '2029-07-09', ley: 'NY', duracionAnios: 2.5 },
  GD30: { vencimiento: '2030-07-09', ley: 'NY', duracionAnios: 3.2 },
  GD35: { vencimiento: '2035-07-09', ley: 'NY', duracionAnios: 5.9 },
  GD38: { vencimiento: '2038-01-09', ley: 'NY', duracionAnios: 7.1 },
  GD41: { vencimiento: '2041-07-09', ley: 'NY', duracionAnios: 7.9 },
  GD46: { vencimiento: '2046-07-09', ley: 'NY', duracionAnios: 8.7 },
}

export const BONARES_META = {
  AL29: { vencimiento: '2029-07-09', ley: 'ARG', duracionAnios: 2.5 },
  AL30: { vencimiento: '2030-07-09', ley: 'ARG', duracionAnios: 3.2 },
  AL35: { vencimiento: '2035-07-09', ley: 'ARG', duracionAnios: 5.9 },
  AL41: { vencimiento: '2041-07-09', ley: 'ARG', duracionAnios: 7.9 },
}

export const DUALES_META = {
  TTS26: { vencimiento: '2026-09-15' },
  TTD26: { vencimiento: '2026-12-15' },
}
