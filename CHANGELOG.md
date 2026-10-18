# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado [SemVer](https://semver.org/lang/es/).

## [1.2.0] — 2026-10-18

**APK propio para Android (Huawei Mate 10 Pro)**, sin cuentas, sin tiendas y sin coste.

### Añadido

- Proyecto **Capacitor 7** (`android/`) con la web empaquetada dentro del APK: la app
  funciona **sin conexión desde el primer arranque**.
- `npm run apk` / `npm run apk:debug`: detectan JDK 17–21 y Android SDK, compilan la web,
  sincronizan y generan el APK firmado en `deliverables/miplan-aws-<versión>.apk`.
- **Exportaciones en la app**: en Android el WebView no descarga con `<a download>`; ahora
  el respaldo JSON, el `.ics` y el vault `.zip` se escriben en la caché de la app y salen
  por la **hoja de compartir** del sistema (guardar en Archivos, enviar por correo…).
- Iconos propios (PWA 192/512 y todas las densidades de Android, incluido el adaptativo) y
  tema nativo oscuro: sin destello blanco al abrir.
- `docs/DISPOSITIVOS.md` con la sección de instalación del APK en EMUI, la advertencia de
  exportar antes de desinstalar y cómo se guarda la clave de firma.


## [1.1.1] — 2026-10-18

Uso real en tus dispositivos, **sin cuentas ni pagos**.

### Añadido

- `scripts/serve.mjs`: servidor estático **sin dependencias** para el build (HTTP/HTTPS,
  exposición en LAN, fallback de SPA, caché correcta para `index.html`/`sw.js`).
- `scripts/make-cert.mjs`: certificado autofirmado con las IPs de tu red para servir por
  HTTPS y tener la PWA offline en el móvil.
- `start-windows.cmd` y `start-mac.command`: doble clic → instala si hace falta, compila
  y abre la app en `http://localhost:7420` (contexto seguro: PWA instalable sin certificados).
- `docs/DISPOSITIVOS.md`: pasos para Windows, **Mac Intel**, **iPhone 13 Pro Max** y
  **Huawei Mate 10 Pro**, cómo mover los datos por respaldo JSON y qué no es posible gratis.
- Scripts: `npm run serve`, `serve:lan`, `serve:lan:https`, `cert:lan`, `test:server`.

### Notas

- Cada dispositivo guarda sus propios datos (IndexedDB); se transportan con
  **Ajustes → Respaldo → Exportar/Importar JSON**. La sincronización automática sigue
  fuera del alcance (fase 3.1).
- En el móvil por HTTP la app funciona y se añade a la pantalla de inicio, pero el service
  worker (offline) exige HTTPS con un certificado en el que el dispositivo confíe.

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
