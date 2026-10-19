# QA-INFORME — QA-001 · Verificación independiente contra el PRD §11

| Campo | Valor |
|---|---|
| task_id | QA-001 |
| Agente | `qa` (verificador independiente) |
| Fecha | 2026-10-18 |
| Fuente de verdad | `prompts/prompt-app-plan-aws.md` (PRD), §11, §12, §2, §8, §13, Anexo C |
| Workspace | `app web aws/` (versión 1.2.1) |
| Riesgo | low · approval_required: false |
| Alcance de escritura | **Solo** `docs/QA-INFORME.md` (ningún otro archivo fue modificado) |

---

## 1. Resumen ejecutivo

La implementación **cumple la gran mayoría de los criterios de aceptación**: los tres
comandos obligatorios pasan con salida real recogida, los tests unitarios cubren 17 de los
18 ítems exigidos por §11.1 con pruebas sustantivas (no de humo), y las reglas duras de
§13 se cumplen. Se encontró **ningún fallo funcional en la app** y **0 tests fallidos**.

No obstante, se reportan **3 defectos de severidad mayor** (ninguno bloquea la integración
del código, pero sí cierran criterios de aceptación y entregables):

1. **Falta el test de round-trip import/export** exigido literalmente en §11.1
   (FAIL de la sección; `src/data/backup.ts` tiene `importBackup`/`parseBackupFile` sin
   ningún test que lo ejercite, unitario o e2e).
2. **El vault de ejemplo entregado tiene enlaces roscos**: `examples/vault-demo/` contiene
   **33 wikilinks de 55 sin archivo destino** dentro del propio demo (incluido
   `_Ruta AWS.md` → 11 certificaciones que no están en la muestra). §11.3 exige "sin
   enlaces roscos" y §12 pide el demo "para que lo abra en Obsidian sin generar nada".
3. **Desviación de alcance Capacitor/APK (§2.2 "basta PWA") no documentada en
   `docs/DECISIONES.md`** (sí en README/CHANGELOG/DISPOSITIVOS): incluye dependencias
   nuevas `@capacitor/*` y scripts `apk` en `package.json`, que el Contrato de desarrollo
   §1.4/§1.6 prohíbe añadir/editar.

Además: 7 escenarios de §11.2 sin cobertura automatizada de escenario completo (5 de ellos
parcialmente cubiertos por tests unitarios de la lógica subyacente), el claim de
Lighthouse ≥90 es **NO VERIFICABLE** en este entorno (documento con procedimiento pero sin
artefacto `lighthouse.json` y sin paquete instalado), y varias cifras de los documentos son
inconsistentes entre sí (bundle: 224,3 / 214,5 / 218,7 KB gzip).

**Veredicto global: ACEPTADO CON DEFECTOS MAYORES A CORREGIR.** Nada de lo anterior es un
fallo funcional de la app; los defectos 1 y 3 son de cumplimiento de criterio/contrato y el
defecto 2 afecta a un entregable concreto. Ningún fallo crítico bloquea la integración.

---

## 2. Evidencia de herramienta (comandos ejecutados y salida real)

### 2.1 `npm test` → **296/296 PASS en 28 archivos**

```
 RUN  v2.1.9  C:/Users/luis9/Documents/universidad/app web aws
 Test Files  28 passed (28)
      Tests  296 passed (296)
   Start at  17:30:53
   Duration  6.21s
```

Salida por archivo (resumen de los 28): `readiness (10)`, `questions (18)`, `recommend (17)`,
`budget (12)`, `seed (18)`, `schedule (23)`, `reminders (17)`, `ics (32)`, `obsidian (28)`,
`theme (8)`, `stats (15)`, `format (19)`, `markdown (9)`, `checklist (10)`, `scoring (11)`,
`parity (11)`, `migrations (4)`, `sm2 (8)`, `clipboard (5)`, `no-hardcoded-strings (1)`,
`vault-demo (1)`, `dashboard/model (3)`, `DashboardPage (1)`, `RoadmapPage (2)`,
`CertPage (2)`, `PracticePage (1)`, `QuestionBankSection (8)`, `QuestionMockRunner (2)`.
Advertencias en stderr: warnings de React Router v7 future flags, un `act(...)` en
`RoadmapPage.test.tsx` y el mensaje dev `[i18n] falta la clave "no.existe"` (esperado, es el
test del fallback). **Ningún test falla.**

### 2.2 `npm run lint` → **limpio (exit 0)**

```
> eslint .
EXITCODE=0
```

Sin errores ni warnings (coincide con el claim de README/DECISIONES).

### 2.3 `npm run build` → **OK (exit 0)**

```
> tsc -b && vite build
✓ 2915 modules transformed.
dist/assets/index-D-ePS1ci.js   516.47 kB │ gzip: 156.60 kB
dist/assets/react-CW0rRIZ4.js   164.92 kB │ gzip:  53.82 kB
dist/assets/index-D0HUBDGw.css   37.59 kB │ gzip:   8.25 kB
✓ built in 6.33s
PWA v0.20.5 — precache 57 entries (2030.24 KiB)
EXITCODE=0
```

Observaciones (no bloqueantes, registradas como defectos menores O-3/O-4 en §7):
- Aviso de Vite en stderr: `<script src="./theme-init.js"> in "/index.html" can't be
  bundled without type="module" attribute` → **benigno y deliberado** (CSP
  `script-src 'self'` sin `unsafe-inline` obliga a script externo no-module; ver
  DECISIONES §3). Es un aviso de Vite, **no de TypeScript**: §11.3 exige "sin warnings de
  TypeScript" y `tsc -b` no emite ninguno.
- Aviso `(!) Some chunks are larger than 500 kB` sobre el chunk `index` (516 kB min / 156,6
  kB gzip): recomendación de Rollup, no error.

### 2.4 `npx tsc --noEmit -p tsconfig.json` → **limpio (exit 0, sin salida)**

### 2.5 E2E funcionales → **14/14 PASS (22,6 s, exit 0)**

```
npx playwright test tests/e2e/flows.spec.ts tests/e2e/exports.spec.ts tests/e2e/questions.spec.ts
...
14 passed (22.6s)
EXITCODE=0
```

Cubre: primer arranque, sesión de estudio, simulacro 46/65→737/720, checklist 8 ítems,
autosave, idioma+tema, sin red, "Hoy", hoja de atajos, layout 360 px ES/EN, vault .zip,
.ics, respaldo JSON, banco de preguntas (F3.2).

> **Nota metodológica:** NO ejecuté `tests/e2e/shots.spec.ts` ni `shots-combos.spec.ts`
> porque reescriben `docs/shots/*.png` y `mockups/*.png`, fuera de mi permiso de escritura
> (2 tests omitidos por política, no por fallo). El orquestador los corrió (16/16 en su
> pase). El conteo total de specs es 16 = 14 míos + 2 de capturas.

### 2.6 Offline real (PWA) → **1/1 PASS con evidencia propia**

```
Start-Process npx vite preview --port 5184  →  HTTP 200 en http://127.0.0.1:5184/
$env:PWA_URL="http://127.0.0.1:5184"; npm run test:pwa
  ok 1 ... pwa-offline.spec.ts:18:1 › carga offline tras la primera visita (service worker) (4.7s)
1 passed (8.4s)  EXITCODE=0
```

(Test de recarga con `context.setOffline(true)` contra el **build de producción** con
service worker. El servidor preview fue detenido después.)

### 2.7 Reglas duras §13 (greps sobre `src/`)

| Regla | Resultado |
|---|---|
| `fetch`/`XMLHttpRequest`/`sendBeacon` en `src/` | **0 coincidencias** |
| `console.log/debug/info` en `src/` | **0 coincidencias** |
| `#rrggbb` en `src/**/*.{ts,tsx}` | **1 coincidencia**: `src/app/prefs.tsx:72` (`#0A0B0D`/`#F6F3EC` al fijar `meta[name=theme-color]`) — ver O-1 en §7 |
| Librería i18n de terceros en `package.json` | **ninguna** (ni i18next, react-intl, formatjs…). `gray-matter` e `ical.js` están en `devDependencies` (permitidos "solo en tests", §3) |
| `eslint-disable` / `@ts-ignore` en `src/` | 1 `eslint-disable-next-line no-console` en `lib/i18n/translate.ts:54` (aviso dev, documentado) y 1 `@ts-expect-error` en un test. Ver O-2 |

### 2.8 Bundle inicial medido (§11.3 ≤ 250 KB gzip)

Análisis del grafo estático real de `dist/`:
- `dist/index.html` precarga: `assets/index-D-ePS1ci.js` (entry) + `assets/react-CW0rRIZ4.js`
  (`modulepreload`) + `assets/index-D0HUBDGw.css`. El chunk `react` no tiene imports
  relativos propios.
- Las 14 pantallas (`DashboardPage`, `NotesPage`, `BudgetPage`…) y `recharts`/`zod`/`jszip`
  aparecen **solo** en el mapa de importación dinámica (`import("./…")`), es decir, bajo
  demanda.

```
Inicial = 156,60 (index) + 53,82 (react) + 8,25 (CSS) = 218,67 KB gzip   →  ≤250 ✅
```

Coincide con DECISIONES §6 (218,7). NO coincide con LIGHTHOUSE.md (214,5) ni con
DECISIONES §3 (224,3): ver defecto D-6.

### 2.9 Contraste AA recalculado por QA (fórmula WCAG 2.1)

| Par | DECISIONES §5 | Recálculo QA | ¿Cuadra? |
|---|---:|---:|:--:|
| Oscuro: texto `#E8EAED` / fondo `#0A0B0D` | 16,34 | 16,34 | ✅ |
| Oscuro: texto / panel `#121418` | 15,30 | 15,30 | ✅ |
| Oscuro: muted `#98A0AA` / fondo | 7,45 | 7,45 | ✅ |
| Oscuro: acento `#FF9900` / fondo | 9,20 | 9,20 | ✅ |
| Oscuro: tinta sobre acento `#0A0B0D`/`#FF9900` | 9,20 | 9,20 | ✅ |
| Claro: texto `#141414` / fondo `#F6F3EC` | 16,62 | 16,62 | ✅ |
| Claro: muted `#6B6459` / fondo | 5,28 | 5,28 | ✅ |
| Claro: acento `#B45309` / fondo | 4,53 | 4,53 | ✅ |
| Claro: tinta `#FFFDF8`/`#B45309` | 4,94 | 4,94 | ✅ |
| Borde control oscuro `#6A7380`/panel | 3,84 | 3,84 | ✅ |
| Borde control claro `#8B8375`/panel | 3,69 | 3,69 | ✅ |
| warn/err sobre panel oscuro | 11,48 / 6,64 | 11,48 / 6,64 | ✅ |

Los 6 pares críticos pasan AA en ambos temas y **la tabla del doc es numéricamente
correcta** (la fila "texto sobre acento" usa la tinta `--accent-ink`, no `--text`: verificar
`src/styles/tokens.css:53,99`; con `--text` sobre acento oscuro daría 1,78:1, que es
justamente el bug que LIGHTHOUSE.md documenta como corregido).

### 2.10 Integridad del vault de ejemplo (lectura directa de `examples/vault-demo/`)

- 13 archivos `.md`, estructura Anexo C correcta (separador **em dash U+2014 = 8212**
  verificado por código de punto en todos los nombres de archivo y carpetas).
- Frontmatter YAML presente y parseable (el test `tests/demo/vault-demo.test.ts` lo valida
  con `gray-matter` y está en verde).
- 5 callouts `> [!…]` en `SAA-C03 — Resumen.md`, 8 tareas `- [ ]/- [x]`, **0 HTML crudo**
  en todo el demo.
- **Wikilinks: 55 totales, 33 sin archivo destino dentro del demo** → defecto D-1 (§7).

### 2.11 Comandos permitidos NO ejecutados por QA

- `npx lighthouse`: el paquete no está instalado y `npx --yes lighthouse@12` requiere red e
  instalación (prohibidas por el contrato) → criterio Lighthouse marcado NO VERIFICABLE.
- `tests/e2e/local-server*.spec.ts` (2 tests): no forman parte de `npm run test:e2e` ni de
  mis criterios obligatorios; no los ejecuté.
- `tests/e2e/shots*.spec.ts` (2 tests): reescriben archivos `docs/`/`mockups/` → omitidos
  por restricción de escritura.

**Contadores de la sesión QA:** ejecutados **312** (296 unit + 14 e2e + 1 PWA + 1 repetición
del generador del demo) · aprobados **312** · fallados **0** · omitidos **4** e2e (2
capturas + 2 local-server).

---

## 3. §11.1 — Tests unitarios obligatorios

| # | Ítem exigido | Veredicto | Evidencia (ruta o comando) |
|---|---|:--:|---|
| 1 | `readiness()` con 6 casos | **PASS** | `src/domain/__tests__/readiness.test.ts` — `computeReadiness §8.1` con "caso 1 sin datos", "caso 2 todo perfecto", "caso 3 sin labs", "caso 4 dominios desparejos", "caso 5 dominios sin intentos cuentan 0", "caso 6 pesos 3/2/1" + borde de redondeo (10 tests, verdes) |
| 2 | `estimatedScore()` | **PASS** | `src/domain/__tests__/scoring.test.ts` — "46/65 → 737", bordes 0/65 y 65/65, total 0, `normalizeAttempt`, `averageOfLast`, `domainProgress` (11 tests) |
| 3 | `nextRecommended()` con prerrequisitos y `retiring` | **PASS** | `src/domain/__tests__/recommend.test.ts` — bloqueo/desbloqueo, "no recomienda una `retiring` a ≤120 días (SAP-C02)", "no recomienda retired", `retiringSoon` con ANS-C01, modo `any` (17 tests) |
| 4 | `sm2()` con 4 secuencias | **PASS** | `src/domain/__tests__/sm2.test.ts` — secuencia "bien" 1→3→7→16, "otra vez" reinicia+lapso, piso de ease 1.3, "fácil" salta escalón (+ escalera, dueDate, cola) (8 tests) |
| 5 | `costoRutaRestante()` con y sin vouchers | **PASS** | `src/domain/__tests__/budget.test.ts` — "sin vouchers: suma precios", "voucher 50 % baja SAA-C03 de 150 a 75", consumo único, vencidos/usados ignorados, aprobados excluidos (12 tests) |
| 6 | Migración Dexie v1 | **PASS** | `src/data/__tests__/migrations.test.ts` — "migración Dexie 1 → 2" convierte `tasks`→`checklistItems` sin perder datos, con `fake-indexeddb/auto` en `tests/setup.ts` (4 tests) |
| 7 | **Import/export round-trip** | **FAIL** | **No existe.** Grep en todo `*.{test,spec}.*`: 0 usos de `importBackup`, `parseBackupFile`, `buildBackupText` (solo `readAppState` en el generador del demo). `src/data/backup.ts` (líneas 77–153) queda sin ejercitar. El e2e `exports.spec.ts` solo verifica la **exportación** (nombre, `schemaVersion`, 13/12 filas), nunca reimporta |
| 8 | `scheduleTopic()` con las 4 ramas de confianza + `dominado` | **PASS** | `src/domain/__tests__/schedule.test.ts` — confianzas 1, 2, 3 (`×0.8`), 5 (tabla), rama 4 vía "secuencia completa 1→3→7", "3.er repaso con confianza ≥4 → dominado a 30 días", pureza, `snoozeTopic` intocado (23 tests) |
| 9 | `buildReminders()`: prioridad, tope diario, silencio, deduplicación, studyDays | **PASS** | `src/domain/__tests__/reminders.test.ts` — "ordena examen > tema > checklist > voucher > inactividad", "maxRemindersPerDay = 1", "quietHours" (incl. cruce de medianoche), "deduplica por (type, refId, día)", "no genera en días no lectivos", ventana 14 d, determinismo (17 tests) |
| 10 | `buildVault()`: snapshot, idempotencia, frontmatter con gray-matter | **PASS** | `src/domain/__tests__/obsidian.test.ts` + `__snapshots__/obsidian.test.ts.snap` — snapshot del árbol C.1 y de 3 notas completas, "frontmatter parseable con gray-matter en todas las notas", "es idempotente", "solo cambia `updated`", orden/UTF-8/perfiles (28 tests) |
| 11 | `renderNote()` / integridad de wikilinks | **PASS** | obsidian.test.ts — "mantiene la integridad de todos los wikilinks del export" (resuelve contra el set de paths del export y degrada si el perfil excluye), "degrada todos los enlaces cuando includeWikilinks es false", YAML parseable |
| 12 | `buildIcs()`: ical.js, UID, VALARM, ≤75 octetos, CRLF, America/Bogota | **PASS** | `src/domain/__tests__/ics.test.ts` (32 tests) — "se parsea con ical.js sin errores", "5 temas + 1 examen → 6 eventos con UID únicos", "VALARM DISPLAY a -PT15M", "ninguna línea física supera 75 octetos UTF-8", "CRLF real en todo el archivo", VTIMEZONE America/Bogota y resolución UTC-5 |
| 13 | `sanitizeFilename()` (prohibidos, emojis, acentos, >100) | **PASS** | obsidian.test.ts — `[\/:*?"<>|]`→`-`, conserva acentos/emoji, NFC, corte a 100 sin separadores colgantes, nombre de reserva |
| 14 | `clipboard` con mock + fallback | **PASS** | `src/lib/__tests__/clipboard.test.ts` (5 tests) — copia exacta del Markdown esperado, fallback `textarea`+`execCommand` cuando rechaza, **funciona sin `navigator.clipboard`**, sin residuos en el DOM |
| 15 | Paridad de diccionarios ES/EN | **PASS** | `src/lib/i18n/__tests__/parity.test.ts` (11 tests) — mismas claves, sin vacíos, mismas variables `{x}`, sin claves duplicadas entre namespaces, pares `_one`/`_other` |
| 16 | Sin strings hardcodeados en JSX | **PASS** | `tests/unit/no-hardcoded-strings.test.ts` — escanea `src/**/*.tsx` (excluye `__tests__`) con lista blanca explícita (`ES/EN`, `Alt+T`, códigos de cert…) |
| 17 | Formatos `es-CO` / `en-US` | **PASS** | `src/lib/__tests__/format.test.ts` (19 tests) — "18 oct 2026" / "Oct 18, 2026", miles, "150 US$"/"$150", horas, porcentaje, score, `dateTimeInTz` Bogotá |
| 18 | Tema `system` con matchMedia mockeado | **PASS** | `src/lib/__tests__/theme.test.tsx` (8 tests) — "system sigue la preferencia del SO", "escucha cambios del SO en vivo, sin recargar", persistencia tras "recargar", `<html lang>` sincronizado, preferencias corruptas ignoradas |

**Resultado §11.1: 17 PASS / 1 FAIL / 0 PARCIAL / 0 NO VERIFICABLE.**

## 4. §11.2 — Escenarios Gherkin (17) mapeados a specs

PRD: "implementar al menos estos en Playwright". Marco *cobertura e2e*, *cobertura unit*
(lógica del escenario) y el veredicto de cobertura del escenario completo.

| # | Escenario | Cobertura encontrada | Veredicto |
|---|---|---|:--:|
| 1 | Primer arranque con datos semilla (13/12, CLF recomendada, SAA bloqueada) | e2e `flows.spec.ts:5` (13 en catálogo vía JSON export `exports.spec.ts:60`, 12 en plan, "Bloqueada por CLF-C02", fase 0); "siguiente recomendada" se valida como certificación activa | **CUBIERTO** |
| 2 | Registrar sesión (heatmap, horas +45, racha) | e2e `flows.spec.ts:17` (minutos y horas semanales); heatmap/racha solo en unit `stats.test.ts` (`heatmap`, `streakDays`); "marca hoy" y "racha se mantiene" **no se afirman en e2e** | **PARCIAL** (D-4) |
| 3 | Simulacro 46/65 → 737 vs 720, desglose por dominio | e2e `flows.spec.ts:34` ("737/720", "Estimado"); desglose vía unit `scoring.test.ts` (`normalizeAttempt`, `domainProgress`) — no afirmado en e2e | **CUBIERTO** |
| 4 | Voucher del 50 % (150→75) | unit `budget.test.ts:74` ("baja SAA-C03 de 150 a 75"), consumo único; **sin e2e** (el PRD pide Playwright) | **PARCIAL** (D-4) |
| 5 | Respaldo y restauración (exportar → borrar → importar → idénticos) | **Sin test**: ni round-trip unit (D-2) ni e2e de reimportación; `exports.spec.ts:60` solo exporta | **NO CUBIERTO** (D-2/D-4) |
| 6 | Sin red | e2e `flows.spec.ts:94` (registra sesión con `setOffline(true)`) + e2e PWA `pwa-offline.spec.ts` (recarga offline con SW) — **ejecutados por QA, en verde** | **CUBIERTO** |
| 7 | Aviso de retiro ANS-C01 ≤120 días | unit `recommend.test.ts:89` (`retiringSoon` ANS-C01) y `seed.test.ts:68` (lifecycle/fecha); UI banner existe (`roadmap.retiring` en `CertCard/CertRow/CertHeader`), **sin test que afirme el texto "Se retira el 31 dic 2026"** | **PARCIAL** (D-4) |
| 8 | Checklist plantilla 8 ítems/3 grupos + recurrencia | e2e `flows.spec.ts:52` (8 checkboxes, "0 de 8"→"1 de 8"); grupos y "crea la instancia de la próxima semana" solo en unit `checklist.test.ts` | **PARCIAL** (D-4) |
| 9 | Nota con autosave (1 s, "guardado a las HH:MM", sobrevive recarga) | e2e `flows.spec.ts:63` | **CUBIERTO** |
| 10 | Copiar certificación para Obsidian (frontmatter, wikilinks, sin HTML) | unit: `obsidian.test.ts` (nota completa snapshot, frontmatter, integridad `[[`), `markdown.test.ts` ("no contiene HTML crudo"); **sin e2e de portapapeles/frontmatter** | **PARCIAL** (D-4) |
| 11 | Exportar vault completo (.zip, `_Ruta AWS.md`, sin BOM, links OK) | e2e `exports.spec.ts:6` (nombre `miplan-aws-vault-YYYY-MM-DD.zip`, firma PK, `_Ruta AWS.md`, Resumen, Dominios/, UTF-8 sin BOM, sin CRLF) + unit integridad de wikilinks del export completo | **CUBIERTO** |
| 12 | Recordatorio de tema vencido (bloque 1 de "Hoy", badge, estudiado conf. 5 → sesión 30 min, repasando 7 d) | Lógica: unit `schedule.test.ts` (confianza 5 → tabla, dominado) y `reminders.test.ts`; **no existe test de `buildTodayQueue`** (no hay `today.test.ts`) ni e2e del flujo "Hoy" con tema vencido/badge/estudiar | **NO CUBIERTO** (D-4) |
| 13 | Notificaciones denegadas (banner .ics + recordatorios en "Hoy") | UI implementada (`PermissionCard.tsx` con `denied`→banner), **cero tests** que simulen `Notification.permission === 'denied'` | **NO CUBIERTO** (D-4) |
| 14 | Calendario .ics (parsea, 6 eventos UID únicos, alarma 15 min) | unit `ics.test.ts:309-320` (escenario exacto) + e2e `exports.spec.ts:39` (descarga con VALARM/TZID/CRLF) | **CUBIERTO** |
| 15 | Cambiar de idioma (labels, fechas, cert intactas, persiste, datos iguales) | e2e `flows.spec.ts:74` (EN, persistencia tras recarga, nombres oficiales intactos); formato "Oct 18, 2026" en `format.test.ts` | **CUBIERTO** |
| 16 | Cambiar de tema (colores, sin destello, sistema en vivo) | e2e `flows.spec.ts:74` (`data-theme` cambia y persiste); sistema en vivo en `theme.test.tsx`; el "sin destello al recargar" lo garantiza `theme-init.js` sin test explícito de flash | **CUBIERTO** |
| 17 | Layout 360 px en ambos idiomas | e2e `flows.spec.ts:144` (Inicio/Hoy/Ruta/Ajustes × ES/EN con medición de overflow) | **CUBIERTO** |

**Resultado §11.2: 9 CUBIERTO / 5 PARCIAL / 2 NO CUBIERTO** (+1 NO CUBIERTO contabilizado
en el 5: escenario 5 respaldo/restauración). Desglose: 9 cubiertos, 5 parciales, 3 sin
cobertura completa de escenario (5, 12, 13).

## 5. §11.3 — Definición de terminado

| Criterio | Veredicto | Evidencia |
|---|:--:|---|
| Build sin errores ni warnings de **TypeScript**; test verde; lint limpio | **PASS** | `npm run build` exit 0 (`tsc -b` sin salida), `npx tsc --noEmit` exit 0, `npm test` 296/296, `npm run lint` exit 0 (§2.1–2.4). Avisos de Vite (theme-init no-module; chunk >500 kB) documentados en O-3/O-4 |
| Lighthouse móvil ≥90 (Perf/A11y/BP) | **NO VERIFICABLE** | Existe `docs/LIGHTHOUSE.md` con fecha, versión (12.8.2), preset móvil, métricas (91/100/100, LCP 3,2 s, TBT 60 ms, CLS 0) y comando de reproducción **creíble**; pero (a) **no hay artefacto** `lighthouse.json` en el workspace, (b) el CLI no está instalado y `npx --yes` requiere red (prohibido). Ver D-5 |
| Bundle inicial ≤250 KB gzip | **PASS** | Medido sobre `dist/`: 156,60 + 53,82 + 8,25 = **218,67 KB gzip** (grafo estático = entry + react + CSS; todo lo demás es import dinámica) (§2.8) |
| Offline tras la primera carga | **PASS** | QA ejecutó: `vite preview` → HTTP 200 → `PWA_URL=… npm run test:pwa` → **1 passed** (recarga con red cortada servida por el SW) + e2e "sin red" 14/14 (§2.5–2.6) |
| Vault exportado abre en Obsidian sin enlaces roscos (frontmatter, callouts, `- [ ]`) | **PARCIAL** | **Export completo**: PASS por construcción — test "integridad de todos los wikilinks" + frontmatter con gray-matter + demo regenerado con `npm run vault:demo` (test en verde). **Entregable `examples/vault-demo/`**: FAIL — 33 de 55 wikilinks sin destino (D-1). Callouts ✅ (5), tareas ✅ (8), frontmatter ✅, sin HTML ✅ (lectura directa) |
| `.ics` en zona horaria correcta | **PASS** | `ics.test.ts` (VTIMEZONE America/Bogota, DTSTART resuelve UTC-5, ical.js parsea) + e2e de descarga con `TZID:America/Bogota` |
| 4 combinaciones ES/EN × oscuro/claro sin strings sin traducir | **PASS** | Capturas `01` (ES-oscuro), `02` (EN-claro), `07` (ES-claro), `08` (EN-oscuro) en `docs/shots/`; paridad de diccionarios (11 tests) + heurística de JSX + e2e idioma/tema/layout 360 ES/EN. (La regeneración de capturas no la ejecutó QA por restricción de escritura: 2 tests omitidos) |
| Contraste AA en 6 pares críticos documentado en DECISIONES | **PASS** | DECISIONES §5 con tabla; **recálculo independiente de QA coincide en los 12 pares comprobados** (§2.9) |
| README con los 6 puntos (requisitos, instalación, comandos, respaldo, dataset, Obsidian+calendario) | **PASS** | `README.md`: secciones `## Requisitos`, `## Instalación y comandos`, `## Cómo hacer respaldo`, `## Cómo actualizar el dataset`, `## Cómo exportar a Obsidian`, `## Cómo importar el calendario` |
| `docs/DECISIONES.md` + `docs/PLANTILLAS-OBSIDIAN.md` (y docs completos) | **PASS** (con reservas en D-3/D-6) | DECISIONES (supuestos, desviaciones, "lo que quedó fuera", checklist §11.3), PLANTILLAS-OBSIDIAN (copia del Anexo C verificada: estructura C.1 literal). También presentes MODELO-DATOS, CONTENIDO, SECURITY (modelo de amenaza de 10 líneas), LIGHTHOUSE, RELEASE, DISPOSITIVOS, CONTRATO-DESARROLLO |

**Resultado §11.3: 8 PASS / 1 PARCIAL / 1 NO VERIFICABLE.**

## 6. §12 Entregables · §2 Alcance · §13 Reglas

### §12 Entregables

| Entregable | Veredicto | Evidencia |
|---|:--:|---|
| Vault de ejemplo `examples/vault-demo/` con estructura Anexo C | **PARCIAL** | 13 archivos, carpetas `_Ruta/_Checklist/_Calendario` + `SAA-C03 — …/{Dominios,Temas,Sesiones,Simulacros}` con em dash correcto; **pero** 33 wikilinks rotos (D-1) y DECISIONES §4 describe "4 dominios" cuando la muestra trae 2 (D-6) |
| 4+ capturas en `docs/shots/` | **PASS** | **8 PNG**: 01 dashboard ES-oscuro, 02 dashboard EN-claro, 03 Hoy móvil, 04 editor de notas, 05 atajos, 06 banco, 07 ES-claro, 08 EN-oscuro (las 4 requeridas + 4 extra) |
| "Lo que no hice y por qué" | **PASS** | `docs/DECISIONES.md` §4 "Lo que quedó fuera (y por qué)" (6 ítems) + §3 desviaciones técnicas + `docs/RELEASE.md`/`CHANGELOG.md` |
| Árbol de archivos, comandos, resumen de decisiones, checklist §11.3 marcado | **PASS** | README "Estructura del proyecto" + comandos + DECISIONES §6 (checklist marcado) |

### §2 Coherencia de alcance

| Punto | Veredicto | Detalle |
|---|:--:|---|
| MVP M1–M14 | **PASS** | Las 14 pantallas/funciones existen (`src/features/*` completo, navegación Hoy/Inicio/Ruta/Notas/Más, seed 13/12 verificado en e2e) |
| **Capacitor / APK** (§2.2: "App móvil nativa: basta PWA") | **FAIL de documentación** | Existente: `capacitor.config.ts`, `android/`, deps `@capacitor/*` (core, android, filesystem, share, cli) y scripts `apk`/`android:sync` **editando `package.json`** (Contrato §1.4 "cero librerías nuevas" y §1.6 "no edites package.json"). Documentado en README §"Usarla en tus dispositivos", CHANGELOG y DISPOSITIVOS §4, **PERO NO en `docs/DECISIONES.md`**, que es donde el PRD exige supuestos y desviaciones (§0, §11.3). Ver D-3 |
| F3.2 banco de preguntas implementada (§2.3: "documenta el diseño, no lo implementes") | **PARCIAL** | Implementada y testeada (18 unit + 1 e2e + captura 06). Documentada como decisión en DECISIONES §1.15, **pero contradicha por DECISIONES §4** que la lista en "lo que quedó fuera" (D-7) |
| Servidor estático LAN (`scripts/serve.mjs`) y CI | **PASS** | No es backend ni sync (F3.1 sigue fuera); documentado en DECISIONES §1.19 |

### §13 Reglas duras anti-regresión

| Regla | Veredicto | Evidencia |
|---|:--:|---|
| Cero `fetch` en `src/` | **PASS** | grep `fetch\|XMLHttpRequest\|sendBeacon` → 0 (§2.7) |
| Cero `#rrggbb` fuera de `tokens.css` | **PASS con observación O-1** | 1 hex en `src/app/prefs.tsx:72` para `meta[name=theme-color]` (infraestructura que no admite `var()`); la regla ESLint existe y cubre `src/features/**` y `src/components/**` (`eslint.config.js:50-61`) — **más estrecha que la literal de §9.11 ("`#` en `.tsx` es un error")**. Cero hex en componentes |
| Cero `console.log` en producción | **PASS** | grep → 0; `no-console: error` en ESLint; único `console.warn` es dev-only con disable documentado (O-2) |
| Sin librería i18n de terceros | **PASS** | `package.json` sin i18n libs; diccionario propio `src/lib/i18n/*` con `defineNamespace` tipado |

---

## 7. Defectos encontrados

| ID | Severidad | Defecto | Criterio | Evidencia |
|---|---|---|---|---|
| **D-1** | **mayor** | `examples/vault-demo/` entregado contiene **33 wikilinks de 55 sin archivo destino** (p. ej. `_Ruta AWS.md` enlaza los Resumen de 11 certificaciones que no están en la muestra; `SAA-C03 — Resumen.md` enlaza dominios 03/04, notas de sesión y temas que no existen en el demo). Abrirlo en Obsidian muestra enlaces roscos en la portada. Adicionalmente DECISIONES §4 afirma "4 dominios" en el demo y solo hay 2. | §11.3 ("sin enlaces roscos"), §12 (demo para abrir sin generar nada) | Script de resolución sobre los 13 `.md` del demo (§2.10); el test de integridad solo cubre el **export completo**, no la muestra recortada (`pickSample` en `tests/demo/vault-demo.test.ts`) |
| **D-2** | **mayor** | Ausencia total del **round-trip import/export** exigido literalmente en §11.1. `importBackup`/`parseBackupFile` (validación zod, modos reemplazar/fusionar) no tienen ningún test; el e2e solo exporta. Un fallo de reimportación (p. ej. tras migración de esquema) pasaría inadvertido. | §11.1 | grep `importBackup\|parseBackupFile\|buildBackupText` en `*.{test,spec}` → solo `readAppState` en el generador del demo |
| **D-3** | **mayor** | Desviación de alcance **Capacitor/APK** (app empaquetada como APK con `@capacitor/*` y edición de `package.json`) no documentada en `docs/DECISIONES.md`, pese a que el PRD designa ese documento para supuestos/desviaciones y el Contrato §1.4/§1.6 prohíbe librerías nuevas y editar `package.json`. Documentación parcial sí existe en README/CHANGELOG/DISPOSITIVOS. | §2.2, §11.3, Contrato §1.4/§1.6 | grep `capacitor` en DECISIONES/RELEASE → 0 coincidencias; `package.json:26-28,68` |
| **D-4** | **menor** | Tres escenarios §11.2 **sin cobertura automatizada del escenario** y cuatro con cobertura solo parcial: (sin cobertura) *Respaldo y restauración*, *Recordatorio de tema vencido en "Hoy"* (no hay `today.test.ts` ni e2e del flujo), *Notificaciones denegadas* (0 tests del permiso); (parciales) *Voucher 50 %* (unit, sin Playwright), *Aviso de retiro* (sin aserción del banner), *Registrar sesión* (heatmap/racha no afirmados), *Checklist recurrencia* (siguiente instancia no afirmada en e2e), *Copiar para Obsidian* (sin e2e de portapapeles) | §11.2 ("implementar al menos estos en Playwright") | §4 de este informe |
| **D-5** | **menor** | Claim de Lighthouse ≥90 **no verificable de forma independiente**: sin artefacto `lighthouse.json` en el workspace y sin posibilidad de ejecutar el CLI (red/instalación prohibidas). El documento es detallado y reproducible, pero la evidencia retenida es solo la prosa. | §11.3 | `docs/LIGHTHOUSE.md`; glob `lighthouse*` → solo el .md; `node_modules/.bin/lighthouse.cmd` → False |
| **D-6** | **menor** | Cifras **inconsistentes entre documentos**: bundle inicial 224,3 KB (DECISIONES §3) vs 214,5 (LIGHTHOUSE) vs 218,7 (DECISIONES §6, coincide con mi medición); "24 entradas" de precache citadas en DECISIONES §6 vs **57 reales** en el build; "4 dominios" del demo en DECISIONES §4 vs 2 reales. | §11.3 (evidencia fiable) | §2.8, salida de build, listing de `examples/vault-demo/` |
| **D-7** | **menor** | Contradicción documental interna: DECISIONES §1.15 declara "F3.2 implementada (no solo diseñada)" mientras que §4 lista "Importador de preguntas propio (CSV/JSON): fase 3.2" dentro de "Lo que quedó fuera". | §2.3 / §13 ("sin TODOs silenciosos": la lista debe ser veraz) | `docs/DECISIONES.md` §1.15 vs §4 |

### Observaciones (no computan como defectos)

- **O-1:** el único hex en `.tsx` es `meta[name=theme-color]` en `src/app/prefs.tsx:72`
  (justificado: meta HTML no admite CSS vars; excepción documentada en la cabecera de
  `eslint.config.js`). La regla ESLint no cubre `src/app/**` → más laxa que la redacción
  literal de §9.11. Recomendable ampliarla o explicitarlo en DECISIONES.
- **O-2:** `console.warn` con `eslint-disable` en `src/lib/i18n/translate.ts:54` (aviso dev
  de clave faltante) y un `@ts-expect-error` de limpieza en `clipboard.test.ts:17`.
  Ambos mínimos y razonables; el contrato prohibía `eslint-disable` "nuevos".
- **O-3:** aviso de Vite por `theme-init.js` sin `type="module"` (necesario por la CSP).
- **O-4:** aviso de Rollup por chunk `index` > 500 kB minificado (156,60 kB gzip, dentro de
  presupuesto).
- **O-5:** `DECISIONES.md` §6 tiene una fila con formato roto (falta salto de línea antes de
  `| Se ve terminada en las 4 combinaciones`), lo que fusiona dos filas de la tabla.

## 8. Entregables faltantes

1. Test de round-trip import/export (D-2) — **falta**.
2. Artefacto de Lighthouse (`lighthouse.json`) o re-ejecución con evidencia retenida (D-5).
3. Integridad de wikilinks en `examples/vault-demo/` (D-1) — o bien regenerar el demo con
   el perfil completo, o bien añadir aserción de integridad en `tests/demo/vault-demo.test.ts`
   sobre la muestra recortada.
4. Documentación de la desviación Capacitor en `docs/DECISIONES.md` (D-3).

No faltan: ningún archivo de docs exigidos, capturas, vault demo, README, ni tests de los
demás 17 ítems de §11.1.

## 9. Limitaciones y riesgos residuales

- **Limitaciones de ejecución:** sin red ni instalación de paquetes → imposible reproducir
  Lighthouse ni `npx --yes lighthouse`; prohibido modificar archivos → no ejecuté los 2
  specs de capturas (no los reescribieron) ni usé `npm run vault:demo` directamente. No
  verifiqué la importación del `.ics` en Google Calendar (requiere red/servicio externo; el
  PRD lo acepta como verificación manual).
- **Efecto lateral declarado (contenido intacto):** `npm test` (comando obligatorio) incluye
  `tests/demo/vault-demo.test.ts`, que **reescribe en disco `examples/vault-demo/`** como
  parte de su ejecución (mtime 17:30:58 en los 13 `.md`). Verifiqué por hash SHA-256 que la
  regeneración es **determinista y byte-idéntica**: hash agregado antes y después de una
  segunda ejecución (`npx vitest run tests/demo/vault-demo.test.ts`, 1/1 verde) idéntico
  (`768` hex, 13 archivos, mismos hashes individuales). El contenido del entregable no
  cambió; solo su fecha de modificación. De paso esto confirma el test "es idempotente".
- **PNG de capturas:** `docs/shots/*.png` (8) y `mockups/*.png` (3) tienen mtime ~17:21,
  **anterior** a mis ejecuciones (mi `npm test` arrancó 17:30:53) y consistente con el pase
  e2e previo del orquestador (16/16). Yo no ejecuté ningún spec de capturas; la comprobación
  de los PNG fue de **solo lectura**.
- **No ejecutado por QA:** `tests/e2e/local-server*.spec.ts` (2, fuera de `test:e2e`).
- **Riesgo residual:** una prueba verde no garantiza ausencia de defectos (criterio del rol
  qa). No se auditaron en profundidad: rendimiento con datasets grandes, cuota de IndexedDB
  real, comportamiento en Safari/Firefox, ni el APK compilado (`deliverables/*.apk` no se
  instaló). La verificación de "sin destello de tema" y "vault visual en Obsidian" sigue
  siendo manual.
- **Decisión a criterio del orquestador:** D-1/D-2/D-3 son de severidad mayor; según las
  reglas del entorno, un fallo crítico bloquea integración — **no considero ninguno
  bloqueador** (la app funciona y los tests pasan), por eso `approval_required: false`, pero
  recomiendo corregir D-1 y D-2 antes de considerar cerrado el §11.
