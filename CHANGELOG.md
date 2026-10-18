# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado [SemVer](https://semver.org/lang/es/).

## [1.1.0] — 2026-10-18

Cierre de la §11.3 y salto funcional de la fase 3.2.

### Añadido

- **F3.2 · Banco de preguntas propio** (`src/domain/questions.ts`, 18 tests):
  importación **CSV/JSON** con preview de errores por línea, deduplicación por
  certificación + enunciado, listado editable con filtros y acciones en bloque, y
  **simulacro real** que reparte las preguntas por los pesos de dominio del examen
  (resto mayor determinista) y guarda el intento con desglose y `questionIds`.
- Tabla Dexie `questions` (esquema **v3**, migración sin pérdida de datos).
- 6 preguntas propias en los datos de ejemplo + `examples/preguntas-ejemplo.csv`
  (8 preguntas) y plantilla descargable desde la UI.
- **Hoja de atajos** (`?`) con `Ctrl/Cmd+K`, `Alt+T`, `Alt+L`, `Ctrl+S` y `Ctrl+B`.
- `npm run verify` (lint + tipos + tests + build) y CI de GitHub Actions con tres
  jobs: verificación, end-to-end y offline real con service worker (16 pruebas E2E).
- `docs/LIGHTHOUSE.md` con la medición (91 / 100 / 100) y cómo reproducirla.
- Capturas de las **cuatro combinaciones** idioma × tema en `docs/shots/`.

### Cambiado

- «Hoy» muestra los 5 primeros ítems de checklist y despliega el resto
  («ver los N restantes»): la bandeja se lee en 30 segundos.
- Prerrequisitos «A o B» (DOP-C02, SCS-C03) con `prerequisiteMode: 'any'`: basta uno.
- Un único namespace `dashboard` (se integró el `dashboardExtra` que había creado un
  agente) y fuera la clave huérfana `roadmap.phase0.title`.
- Etiquetas de voucher neutrales (`CLF-C02 · 50 %`) en lugar de texto en español
  fijo, para que se lean bien en los dos idiomas.

### Corregido

- **Contraste**: el botón primario pintaba `#e8eaed` sobre `#ff9900` (1,77:1) porque
  `tailwind-merge` descartaba `text-accent-ink` al combinarlo con `text-ui`. `cn()` ahora
  conoce los tokens del proyecto (9,2:1 y accesibilidad 100 en Lighthouse).
- **Peso inicial**: `recharts` y `zod` se precargaban aunque solo se usan en pantallas
  perezosas (325 KB gzip reales). Inicial: 218,7 KB gzip.
- `remainingRouteCost` ya no consume voucher en certificaciones de precio `null`.
- Los menús Radix cierran al elegir un ítem (faltaba quitar un `preventDefault`).
- La interpolación de `t()` no se perdía fuera del provider.

## [1.0.0] — 2026-10-18

MVP completo del brief: 14 módulos, dominio puro testeado, i18n ES/EN, tema
claro/oscuro/sistema, export a Obsidian, `.ics`, PWA offline, respaldo JSON (con cifrado
opcional) y documentación (`DECISIONES`, `MODELO-DATOS`, `CONTENIDO`,
`PLANTILLAS-OBSIDIAN`, `SECURITY`).
