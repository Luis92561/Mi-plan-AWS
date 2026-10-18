# Lighthouse — medición real

Medido el **18 de octubre de 2026** con **Lighthouse 12.8.2**, preset **móvil**
(form factor `mobile`, throttling simulado), contra el **build de producción** servido con
`vite preview` — no contra el servidor de desarrollo.

## Resultado

| Categoría | Puntuación | Objetivo §11.3 |
|---|---:|---|
| Performance | **91** | ≥ 90 ✅ |
| Accessibility | **100** | ≥ 90 ✅ |
| Best Practices | **100** | ≥ 90 ✅ |

Métricas principales:

| Métrica | Valor |
|---|---|
| First Contentful Paint | 2,2 s |
| Largest Contentful Paint | 3,2 s |
| Total Blocking Time | 60 ms |
| Cumulative Layout Shift | **0** |

## Cómo reproducirlo

```powershell
npm run build
npx vite preview --port 5185 --strictPort           # deja el build servido
$env:CHROME_PATH = "<ruta a chrome.exe de Chromium/Chrome>"
npx --yes lighthouse@12 http://127.0.0.1:5185/ `
  --only-categories=performance,accessibility,best-practices `
  --output=json --output-path=./lighthouse.json `
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" --quiet
```

El entorno de agentes usó el Chromium de Playwright
(`%LOCALAPPDATA%\ms-playwright\chromium-1248\chrome-win64\chrome.exe`).

## Qué se corrigió para pasar de 83 a 91 y de 96 a 100

1. **Contraste (96 → 100).** El audit `color-contrast` marcó el botón primario con
   1,77:1: `tailwind-merge` no conocía los tokens del proyecto y, al combinar
   `text-accent-ink` con `text-ui`, descartaba el color. Se extendió `cn()` con los grupos
   `font-size` / `text-color` propios; el botón pasa a 9,2:1.
2. **Peso inicial (83 → 91).** `dist/index.html` precargaba `charts` (recharts, 107 KB
   gzip) y `data` (dexie + zod) aunque solo se usan en pantallas perezosas: el inicial
   real era 325 KB gzip. Se eliminaron esos `manualChunks`, de modo que el único
   `modulepreload` es React y `recharts`/`zod`/`jszip` se descargan al abrir su pantalla.
   Inicial resultante: **214,5 KB gzip** (152,5 + 53,8 + 8,2).

## Auditorías que siguen por debajo de 1 (no bloquean)

- `largest-contentful-paint` (0,51) y `first-contentful-paint` (0,66): es una SPA React
  que pinta tras el primer chunk; se compensa con `CLS 0` y `TBT 60 ms`.
- `legacy-javascript` (0,5): polyfills que inyecta Vite para el target `es2022`.
- `unused-javascript`: código de las pantallas ya cargadas; el resto llega bajo demanda.
