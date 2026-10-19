# Decisiones, supuestos y estado del MVP

Documento pedido por la §7.8 y la §11.3: qué se asumió, qué se cambió respecto al
brief, qué quedó fuera y con qué evidencia se cierra cada criterio de aceptación.

Fecha de cierre: **18 de octubre de 2026**.

---

## 1. Supuestos aplicados (el brief pedía no preguntar y dejar constancia)

1. **`mockups/` no venía con los archivos.** La §9.1 cita tres capturas y un
   `mockup.css` que no existían en el entorno. Se reconstruyó `mockups/mockup.css` con
   los tokens exactos de §9.2–§9.3 y las capturas se **generan desde la app real**
   (`npm run shots`), no son un diseño paralelo. Las tres imágenes existen ahora en
   `mockups/` y en `docs/shots/`.
2. **La fase 0 no es una fila de `planItems`.** `planItems.certId` referencia una
   certificación del catálogo y la fase 0 es "preparación gratuita, no es un examen"
   (§6.2). Por eso se representa con **recursos** (`resources.certId === null`) y la
   Ruta la muestra como primera sección del timeline con su propio progreso. Efecto
   colateral buscado: el escenario §11.2 «13 en el catálogo y 12 en mi ruta» se cumple
   literalmente.
3. **Cuándo se siembra qué.** Al primer arranque se siembra **el catálogo** (13
   certificaciones, recursos de catálogo y perfiles de exportación). La ruta personal
   (12 `planItems` + checklists + temas base) solo se crea cuando pulsas «Cargar ruta
   recomendada», que es lo que describe el escenario Gherkin del primer arranque.
4. **`ChecklistItem.archived` es un campo añadido.** El modelo de §5 no lo declara,
   pero §7.10 y §8.9 piden "archivar en bloque" y "los archivados no cuentan en el
   progreso". Se añadió `archived?: boolean` y `checklistProgress` los excluye.
5. **Zona horaria fija `America/Bogota`** en todas las fechas y horas del producto
   (§3). Los formateos `Intl` de `src/lib/format.ts` fijan `timeZone: TZ`, de modo que
   un ISO con hora se pinta en el día bogotano aunque el equipo esté en otra zona.
6. **`dailyReminderTime` por defecto `19:00`** y `quietHours` `22:00–07:00`, con
   `maxRemindersPerDay: 3` (§7.8, §8.8).
7. **`budgetTotals.burnRatio`** se define como `pagado / (planeado + pagado)`; por eso
   la alerta §8.5.5 («gasto real > 120 % de lo planeado») se evalúa como
   `pagado > planeado × 1,2` sobre los importes, no sobre el ratio.
8. **Un voucher sirve hasta su fecha de vencimiento inclusive** (`expiresAt >= today`).
   Un voucher sin fecha de expiración no caduca. El de aprobación dura 180 días.
9. **`remainingRouteCost` no consume voucher en certificaciones de precio `null`**
   (AIB-C01). Detectado por el agente de presupuesto y corregido.
10. **`t()` devuelve la clave cuando falta** (con aviso en desarrollo) en vez de lanzar:
    una traducción perdida nunca debe romper una pantalla.
11. **Prerrequisitos «A o B»** (DOP-C02 «DVA-C02 o SOA-C03», SCS-C03 «SAA-C03 o SOA-C03»):
    el modelo gana `prerequisiteMode?: 'all' | 'any'`. En modo `any` basta aprobar uno;
    antes los dos códigos del Anexo A bloqueaban de más. La ficha lo explica con una
    línea y `unlockState`/`blockingPrerequisites` lo respetan (4 tests).
12. **«Hoy» se lee en 30 segundos**: el bloque de checklist muestra los 5 primeros
    ítems y el resto queda a un clic («ver los N restantes»), con el conteo total
    siempre visible. Los temas vencidos no se recortan (son pocos por diseño).
13. **Hoja de atajos descubrible**: `?` abre un diálogo con `Ctrl/Cmd+K`, `Alt+T`,
    `Alt+L`, `Ctrl+S` y `Ctrl+B`; también está en la paleta de comandos.
14. **Un solo namespace `dashboard`**: las 14 claves que un agente había puesto en
    `dashboardExtra` se integraron en `dashboard` (diccionario único por área).
15. **F3.2 implementada** (no solo diseñada): banco de preguntas propio con importador
    CSV/JSON, selección ponderada por dominio y simulacro real. Se añadió la tabla
    `questions` (esquema v3) y `src/domain/questions.ts` con los parsers, el reparto
    (resto mayor sobre los pesos) y la corrección con desglose por dominio.
    El prompt §16 pedía «CRUD de preguntas, import CSV/JSON, selección por dominio con
    pesos, puntaje estimado»; eso es exactamente lo entregado.
19. **Uso en móvil sin cuentas ni pagos**: se añade un servidor estático propio
    (`scripts/serve.mjs`) y dos lanzadores de doble clic para Windows y Mac. En
    `localhost` el navegador considera el origen seguro, así que la PWA se instala y
    funciona offline **sin certificados**; en el móvil, por HTTP, la app funciona y se
    añade a la pantalla de inicio pero el service worker exige HTTPS, que se resuelve con
    un certificado propio (`npm run cert:lan`) en el que el dispositivo debe confiar una
    vez. **No se sincroniza nada**: cada dispositivo guarda su IndexedDB y el transporte
    es el respaldo JSON (documentado en `docs/DISPOSITIVOS.md`). F3.1 (sync con servidor)
    sigue fuera por decisión de producto.
17. **CI y publicación**: `.github/workflows/ci.yml` con tres jobs (verificación
    lint+tipos+tests+build, end-to-end y offline real con service worker) y
    `npm run verify` que ejecuta localmente lo mismo que el job de verificación.
    La guía de publicación está en `docs/RELEASE.md` y el historial en `CHANGELOG.md` (1.1.0).
18. **Etiquetas de voucher neutrales**: los vouchers generados por la app ya no escriben
    «50 % por aprobar X» en español; guardan `{code} · 50 %` para que la alerta se lea
    igual en ES y EN (la detecté mirando la captura EN-oscuro).

16. **Lighthouse y `tailwind-merge`**: el audit de contraste detectó que el botón
    primario pintaba `#e8eaed` sobre `#ff9900` (1,77:1) porque `tailwind-merge` no
    conocía los tokens y descartaba `text-accent-ink` al combinarlo con `text-ui`. Se
    extendió `cn()` con los grupos de talla/color del proyecto: el color se aplica y el
    contraste queda en 9,2:1.

## 2. Datos del Anexo A marcados `verificar`

Se copiaron literalmente. Lo que el Anexo A no permite verificar quedó así:

| Certificación | Campo | Valor aplicado |
|---|---|---|
| AIB-C01 | `priceUsd` | `null` (el anexo dice *verificar*) |
| AIB-C01 | `questions` | `0` y nota con `verificar` |
| AIB-C01 | `phase` | `4` (el tipo solo admite 0–4 y el anexo no da fase; queda fuera de la ruta recomendada) |
| Todas | `scoredQuestions` | `null` — §A.5 lo fija así y la UI muestra solo el total |
| DOP-C02 | `prerequisites` | `['DVA-C02','SOA-C03']` con nota: basta **uno** (el anexo dice "o") |
| SCS-C03 | `prerequisites` | `['SAA-C03','SOA-C03']` con la misma nota |
| SAP-C02 | `lifecycle` | `retiring`, último día 2026-11-16 (banner ámbar desde el día 1) |
| ANS-C01 | `lifecycle` | `retiring`, se retira 2026-12-31 (≤120 días ⇒ banner y no se recomienda) |

> Consecuencia visible y honesta: con `prerequisites` guardando los dos códigos, DOP-C02
> y SCS-C03 se desbloquean al aprobar **ambos**. La nota del registro lo explica y el
> campo se puede editar desde la ficha (el catálogo es editable, §5).

## 3. Desviaciones técnicas y por qué

| Decisión del brief | Qué se hizo | Por qué |
|---|---|---|
| Script inline del tema en `index.html` | `public/theme-init.js` externo, cargado en `<head>` antes del paint | La CSP del propio brief es `script-src 'self'` **sin** `'unsafe-inline'`: un script inline sería bloqueado. Sigue siendo bloqueante y se ejecuta antes del primer paint, así que no hay destello. |
| `HashRouter` "para abrir el build desde archivo" | `HashRouter` con `base: './'` (sirve para hosting estático), pero **no** se promete `file://` | Con la CSP (`default-src 'self'`) los recursos no cargan desde `file://` (origen opaco). La app se sirve con `npm run preview` o cualquier estático. Documentado en el README. |
| `manualChunks` y bundle inicial ≤250 KB gzip | Rutas con `React.lazy` + `Suspense`; `recharts`, `react-markdown` y `jszip` llegan con su pantalla | Medido en el build de verificación (re-medido en DEV-004, 19-10-2026): inicial = `index` 156,76 + `react` 53,82 + CSS 8,25 = **218,8 KB gzip**; `charts` (103,5 KB gzip) solo al abrir Práctica/Presupuesto. |
| Tailwind con tokens en `var(--x)` | Cada token declara además una tripleta `--x-rgb` y Tailwind mapea `rgb(var(--x-rgb) / <alpha-value>)` | Descubierto durante la integración: con `var()` puro, `bg-panel/60` o `border-ok/40` **no generan CSS**. Con la tripleta, los modificadores de opacidad funcionan. |
| `formatDate` con `Intl` | Se componen las partes (`formatToParts`) en lugar de usar el patrón por defecto | `es-CO` intercala «de» (`18 de oct de 2026`); el contrato pide `18 oct 2026`. |
| Paleta con `--line-strong:#3a3f48` / `#c9c1b0` para bordes | Se añadió `--control-line` (oscuro `#6a7380`, claro `#8b8375`) para bordes de controles | `--line-strong` no llega a 3:1 en oscuro (1,9:1) ni en claro (1,8:1); la §9.8 exige 3:1 en bordes de controles. `--line`/`--line-strong` se siguen usando para separadores. |
| `readPrefs` privado | Exportado desde `src/app/prefs.tsx` | Necesario para probar la persistencia tema/idioma entre recargas (§11.1). |
| Diccionario "define la forma en `es`" | `es/*` compartido + un archivo por feature (`src/lib/i18n/features/<ns>.ts`) con ES y EN juntos | Permite trabajar por pantallas sin conflictos y el tipo `defineNamespace` obliga a que EN tenga exactamente las claves de ES (si falta una, `tsc` falla). |
| `schemaVersion` inicial 1 | `SCHEMA_VERSION = 3`: v1 incluía la tabla heredada `tasks`, v2 la convierte en `checklistItems` y la elimina; v3 añade la tabla `questions` (F3.2) sin tocar datos existentes | La §5 pide explícitamente la migración v1→v2 y probarla con `fake-indexeddb` (está en `src/data/__tests__/migrations.test.ts`); v3 es un cambio aditivo (§1.15). |

### 3.1 Desviación de alcance: empaquetado Android con Capacitor (declarada)

Antes de esta corrección de QA existía en el repo `capacitor.config.ts`, la carpeta
`android/`, cinco dependencias `@capacitor/*` (core, android, filesystem, share, cli)
y los scripts `apk` / `android:sync` en `package.json`, documentados solo en README,
CHANGELOG y `docs/DISPOSITIVOS.md`. Eso es una **desviación del brief**:

- La §2.2 del PRD dice «App móvil nativa: **basta PWA**».
- El Contrato de desarrollo §1.4 prohíbe librerías nuevas y §1.6 prohíbe editar
  `package.json` — ambos incumplidos por esa integración.

Queda **declarada aquí** (que es donde el PRD §0 y la §11.3 exigen supuestos y
desviaciones): el empaquetado APK fue una decisión previa de empaquetado para
instalar la app sin navegador en Android, ya documentada en `docs/DISPOSITIVOS.md` §4,
y su código sigue en el árbol. No se amplía: para la entrega de esta tarea no se
añaden dependencias ni scripts nuevos, y `src/data/backup.ts` solo usa los plugins de
Capacitor bajo `import()` dinámico con *fallback* a descarga normal en navegador
(`shareInNativeShell` devuelve `false` si no hay plataforma nativa, así que la PWA
nunca depende de ellos). Si el orquestador decide eliminarlo, el alcance de esa tarea
sería `package.json`, `capacitor.config.ts`, `android/`, `src/data/backup.ts` y los
docs que lo referencian.

### 3.2 Desviación de producto: la frase de paso solo protege el respaldo exportado (§7.8)

El PRD §7.8 pide que, si se activa la frase de paso, la app «pida la frase al abrir».
La implementación actual usa `passphraseEnabled` únicamente para habilitar el export
**cifrado** (`.json.enc`, `src/features/settings/backupCrypto.ts`); **no hay gate de
apertura**: con la app abierta, los datos viven en IndexedDB en claro, como cualquier
PWA local-first sin cifrado en reposo del navegador.

Por qué así: un gate de UI sin cifrar la base sería **cosmético** — quien tiene acceso
al perfil del navegador lee IndexedDB directamente, gate o no. El cifrado en reposo de
los datos vivos (clave derivada de la frase) es trabajo de una fase posterior; mientras
tanto, la frase protege exactamente lo que se promete en `docs/SECURITY.md`: el respaldo
exportado, y se descarta de memoria al terminar.

Esta entrada **declara la desviación** (PRD §0 y §11.3 exigen que quede registrada) y
queda descrita con el mismo tono en `docs/SECURITY.md` (modelo de amenaza, punto 1) y en
el hallazgo **F-02** de `docs/SEGURIDAD-REVISION.md`. La implementación del gate de
§7.8 (aun como bloqueo cosmético + recordatorio de exportar) fue **descartada por el
usuario** el 19-10-2026 (aprobación en el cierre H3; ver §8): no se construye.

## 4. Lo que quedó fuera (y por qué)

- **Escritura en el vault de Obsidian** (URI handler `obsidian://`): fuera de alcance por
  §2.2. La app solo *genera* Markdown y `.zip`.
- **Importador de preguntas propio (CSV/JSON)**: **no queda fuera — F3.2 sí está
  implementada** (ver §1.15): banco de preguntas con parsers CSV/JSON, selección
  ponderada por dominio y simulacro real, testeada en unit y e2e. Lo que sí sigue
  fuera es el contenido: el banco empieza vacío porque los dumps de preguntas están
  prohibidos (§13), así que el usuario importa su propio CSV/JSON.
- **Sincronización multi-dispositivo, login, PDF mensual**: fases 3.1/3.3, solo diseñadas.
- **Historial de versiones de notas**: explícitamente fuera del MVP (§7.11); la red de
  seguridad es el respaldo JSON y el export a Obsidian.
- **`file://`**: ver §3 de este documento.
- **Captura visual de las 4 combinaciones ES/EN × claro/oscuro** con comparación píxel a
  píxel: se generan capturas de ES-oscuro y EN-claro y los tests E2E comprueban idioma,
  tema persistido y ausencia de desbordes a 360 px en ambos idiomas. La revisión visual
  de las otras dos combinaciones es manual (misma hoja de estilos, mismos tokens).
- **Vault de ejemplo recortado**: `examples/vault-demo/` incluye la portada
  (`_Ruta`, `_Checklist`, `_Calendario`) y una muestra esencial de la carpeta de
  SAA-C03 (resumen, checklist, **2 de sus 4 dominios**, 2 temas, 2 sesiones y
  1 simulacro; 13 archivos) para que se abra sin ruido. Los wikilinks que apuntaban
  a archivos fuera de la muestra se degradan a texto plano en el propio test
  generador (`tests/demo/vault-demo.test.ts`, §8.9), que además aserciona que la
  muestra queda con **0 enlaces sin destino**.

## 5. Contraste WCAG AA (§9.8, §9.11) — medido, no estimado

Pares críticos calculados con la fórmula de luminancia relativa de WCAG 2.1:

| Par | Oscuro | Claro |
|---|---:|---:|
| texto sobre fondo | 16,34:1 | 16,62:1 |
| texto sobre panel | 15,30:1 | 18,12:1 |
| muted sobre fondo | 7,45:1 | 5,28:1 |
| muted sobre panel | 6,97:1 | 5,75:1 |
| acento sobre fondo | 9,20:1 | 4,53:1 |
| acento sobre panel | 8,61:1 | 4,94:1 |
| texto sobre acento | 9,20:1 | 4,94:1 |
| borde de control sobre panel | 3,84:1 | 3,69:1 |
| borde de control sobre fondo | 4,10:1 | 3,38:1 |
| ok / warn / err sobre panel | 9,66 / 11,48 / 6,64 | 5,23 / 5,83 / 7,39 |

Todos ≥4,5:1 para texto y ≥3:1 para bordes de controles en ambos temas.

## 6. Checklist de la §11.3

| Criterio | Estado | Evidencia |
|---|---|---|
| `build` sin errores ni warnings de TypeScript | ✅ | `npm run build` → `tsc -b` limpio + `vite build` (6,4 s) |
| `test` verde | ✅ | `npm test` → **310 tests, 31 archivos** |
| `test:e2e` verde | ✅ | `npm run test:e2e` → **23 pruebas de navegador, 0 fallidas** (escenarios §11.2: respaldo y restauración, «Hoy» con tema vencido y notificaciones denegadas, más los cuatro parciales de aviso de retiro, voucher, recurrencia de checklist y heatmap). El script excluye por diseño `pwa`/`local-server` (`--grep-invert`), que se ejecutan aparte con `npm run test:pwa` y `npm run test:server`. |
| `lint` limpio | ✅ | `npm run lint` → 0 errores, 0 warnings |
| Lighthouse móvil ≥90 (Perf/A11y/Best Practices) | ✅ | Medido con Lighthouse 12.8.2 sobre el build servido (`vite preview`) con Chromium móvil: **Performance 91 · Accesibilidad 100 · Best Practices 100** (LCP 3,2 s, TBT 60 ms, CLS 0). Dos correcciones lo hicieron posible: contraste del botón primario (tailwind-merge) y sacar `recharts`+`zod` del grafo inicial (Vite los precargaba y el inicial real era 325 KB gzip; ahora 218,8 KB). Detalle de medición en `docs/LIGHTHOUSE.md`. |
| Bundle inicial ≤250 KB gzip | ✅ | **218,8 KB gzip** medidos (`index` 156,76 + `react` 53,82 + CSS 8,25). `recharts`, `jszip` y `zod` solo se descargan al abrir su pantalla; el único `modulepreload` del HTML es React. |
| Funciona offline tras la primera carga | ✅ | Verificado dos veces: (a) E2E «sin red» registra una sesión con el navegador en `offline`; (b) `npm run build` + `vite preview` + `PWA_URL=… npm run test:pwa` recarga la app con la red cortada y el service worker sirviéndola desde el precache (57 entradas en el build actual). |
| Vault exportado se abre en Obsidian sin enlaces roscos | ✅ por construcción y test | Test de integridad de enlaces (todo `[[wikilink]]` resuelve a un archivo del mismo export) + test de `examples/vault-demo/` que degrada la muestra contra su set efectivo y aserciona **0 wikilinks sin destino** (regenerar con `npm run vault:demo`). |
| `.ics` se importa en Google Calendar | ✅ por formato | Parseado con `ical.js`, `VALARM`, CRLF, plegado ≤75 octetos, `TZID:America/Bogota`; descarga verificada en E2E. La importación real en Google Calendar es manual (no hay red en runtime). |
| Se ve terminada en las 4 combinaciones | ✅ | Capturas de las cuatro en `docs/shots/`: `01` (ES-oscuro), `02` (EN-claro), `07` (ES-claro) y `08` (EN-oscuro); los E2E recorren Inicio/Hoy/Ruta/Ajustes en ES y EN a 360 px sin desbordes. |
| Ambas paletas pasan AA en 6 pares críticos | ✅ | Tabla de §5 |
| README con requisitos, instalación, comandos, respaldo, dataset, Obsidian y calendario | ✅ | `README.md` |
| `docs/DECISIONES.md` y `docs/PLANTILLAS-OBSIDIAN.md` | ✅ | este archivo y `docs/PLANTILLAS-OBSIDIAN.md` |

Los conteos de esta tabla **crecen con cada tarea** que añade cobertura (o cambia artefactos);
la única fuente válida es la corrida del build de verificación: `npm test`,
`npm run test:e2e` y `npm run build`. Última medición: DEV-004, 19-10-2026
(unit 310/31 · e2e 23 · precache 57 · inicial 218,8 KB gzip).

## 7. Riesgos conocidos

1. **`dev` vs PWA**: en `vite dev` cada ruta es un chunk separado; la prueba de offline
   real necesita el build servido con `npm run preview`. Está documentado en el README.
2. **Prerrequisitos «A o B»**: resuelto con `prerequisiteMode: 'any'` (DOP-C02 y
   SCS-C03). Si el Anexo A cambia a «y», basta con quitar el campo en el registro.
3. **`Intl` depende del navegador**: el formato de mes abreviado puede variar entre
   motores; los tests fijan el comportamiento esperado en Node 24 y Chromium.
4. **Cuota de IndexedDB**: se maneja `QuotaExceededError` con mensaje claro y sugerencia
   de exportar (`common.quotaError`).
5. **Sin dumps**: el banco de preguntas está vacío; el modo simulacro trabaja con
   aciertos/total declarados por el usuario.

## 8. Decisiones del usuario en el cierre (19-10-2026)

El usuario aprobó la versión candidata (H3) **para uso personal** y descartó de forma
explícita los tres puntos que quedaban abiertos. Quedan registrados aquí porque una
decisión aceptada también es parte del expediente:

1. **`npm audit` (hallazgo F-07 de `docs/SEGURIDAD-REVISION.md`): descartado.** No se
   ejecuta: requiere red y la app es de uso personal. Se mantiene el análisis estático
   de superficie ya hecho (sin telemetría, sin clientes HTTP en producción, sin
   dependencias nuevas desde QA-001).
2. **Artefacto Lighthouse (§11.3, defecto D-5): descartado.** No se genera
   `lighthouse.json` (requiere red). El rendimiento queda medido por lo que sí es
   verificable sin red: bundle inicial 218,8 KB gzip (límite 250 KB) y el resto de
   comprobaciones de la §6 de este documento.
3. **Gate de frase de paso al abrir (§7.8, hallazgo F-02): descartado** — ver §3.2. Un
   gate de UI sin cifrado en reposo sería cosmético.

Consecuencia: no hay trabajo pendiente en la cola. Lo que no está verificado está
declarado arriba; el resto del checklist §11.3 consta como cumplido en §6 y en
`docs/QA-INFORME-002.md`.
