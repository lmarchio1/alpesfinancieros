# Alpes Estados Financieros

Sitio de gestión patrimonial con calculadora de rendimientos y breakeven, universo de
bonos argentinos, cotizaciones del dólar en tiempo real, y formulario de contacto.
Construido con React 18, Vite y Tailwind CSS.

## Empezar

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción en `dist/`
- `npm run preview` — previsualiza el build de producción

## Deploy

En vivo en **https://lmarchio1.github.io/alpesfinancieros/**. Cada push a `master`
dispara `.github/workflows/deploy.yml`, que buildea con Vite y publica `dist/` en
GitHub Pages (fuente configurada como "GitHub Actions" en Settings → Pages). El
`base: '/alpesfinancieros/'` en `vite.config.js` es necesario para que los assets
resuelvan bien bajo esa subruta.

## Estructura

```
src/
  assets/
    alpes-icon.png           # isologo (montaña + toro) recortado con fondo transparente
    hero-mountains.jpg, toro-wallstreet.jpg
  components/
    Header.jsx, Footer.jsx, Hero.jsx
    WealthManagement.jsx     # sección resumida "Gestión patrimonial"
    Cotizaciones.jsx         # tabs Dólares / Bonos, única fuente de cotizaciones
    cotizaciones/
      DolaresTab.jsx
      BonosTab.jsx              # orquesta el fetch y arma todo lo de abajo
      RiesgoPaisCard.jsx
      BreakevenCalculator.jsx   # retorno de Letras/Boncer vs. dolarizarse hoy
      RiesgoPaisSensitivity.jsx # impacto estimado del riesgo país en bonos USD
      BondsUniverse.jsx         # Globales / Bonares / Boncer / Letras / Duales
    ContactForm.jsx          # fondo con foto del toro de Wall Street
    ui/                      # Card, Badge, SectionHeading, Logo
  hooks/
    usePolling.js            # fetch + refresco periódico + loading/error
  utils/
    bondMath.js              # retorno de letras/boncer, breakeven, sensibilidad a duración
  services/
    dolaresApi.js            # dolarapi.com (en vivo, sin API key)
    rentaFijaApi.js          # argentinadatos.com + data912.com: bonos CER, letras, riesgo país
    data912Api.js            # data912.com: precios en vivo de letras, bonos y duales
    bondsLiveApi.js          # arma Globales/Bonares/Duales en vivo (precio + metadata estática)
  data/
    bondsReference.js        # metadata estática (vencimiento, ley, duración) de Globales/Bonares/Duales
```

No hay una sección de "Dashboard" separada: la calculadora, la sensibilidad al riesgo
país y el universo de bonos viven todos dentro de la pestaña "Bonos" de Cotizaciones,
para no repetir el riesgo país ni las tablas de Bonos CER/Letras en dos lugares.

Tampoco hay panel de acciones: se sacó porque no hay ninguna API gratuita y sin CORS
para cotizaciones de acciones en tiempo real (se probó Yahoo Finance, que bloquea el
fetch desde el navegador y rate-limitea agresivamente).

## APIs de mercado

- **Dólares**: [dolarapi.com](https://dolarapi.com) — pública, gratuita, sin API key.
- **Bonos CER y riesgo país**: [api.argentinadatos.com](https://api.argentinadatos.com) —
  pública y gratuita, sin API key.
- **Precios en vivo de Letras, Globales, Bonares y duales**: [data912.com](https://data912.com) —
  feed público sin autenticación con precios bid/ask/último de instrumentos argentinos.
  `src/services/data912Api.js` lo consume directamente; `src/services/bondsLiveApi.js`
  combina esos precios con la metadata estática de `src/data/bondsReference.js`
  (vencimiento, ley, duración aproximada) para armar Globales/Bonares/duales.

## Calculadora de rendimientos y breakeven

`src/utils/bondMath.js` calcula, con las cotizaciones en vivo:

- **Retorno de una Letra**: usa el precio de mercado actual (data912) contra el pago
  final pactado al emitirse (argentinadatos) — *no* asume que la letra vale 100 al
  vencimiento, cada una tiene su propio valor final capitalizado.
- **Retorno nominal de un Boncer**: combina la TIR real (sobre CER) con una inflación
  anual esperada que el usuario puede ajustar, ya que el capital se actualiza por CER.
- **Breakeven**: el dólar al que hay que llegar al vencimiento para que el instrumento
  en pesos empate con haberse dolarizado hoy.
- **Sensibilidad al riesgo país**: aproximación por duración modificada
  (%ΔPrecio ≈ −duración × Δrendimiento), asumiendo que el riesgo país se traslada 1 a 1
  al rendimiento exigido de Globales/Bonares. Es una estimación simplificada, no un
  modelo de pricing completo.

## Formulario de contacto

Por defecto funciona en modo demo (no envía datos a ningún servidor). Para
conectarlo a un servicio real (Formspree, EmailJS o un backend propio), completá
`VITE_CONTACT_ENDPOINT` en `.env` con la URL que reciba un POST JSON.
