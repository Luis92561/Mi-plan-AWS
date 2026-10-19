# QA-INFORME-002 — Re-verificación independiente tras DEV-001…DEV-004 y SEC-001

| Campo | Valor |
|---|---|
| task_id | QA-002 |
| Agente | `qa` (verificador independiente) |
| status | completed |
| Fecha | 2026-10-19 |
| Riesgo | medium · approval_required: false |
| Fuente de verdad | PRD `prompts/prompt-app-plan-aws.md` §11.1/§11.2/§11.3, §12, §13 · `docs/CONTRATO-DESARROLLO.md` · informe previo `docs/QA-INFORME.md` (D-1…D-7, P-1) · `docs/SEGURIDAD-REVISION.md` (SEC-001) |
| Workspace | `app web aws/` (v1.2.1) |
| Alcance de escritura | **Solo** `docs/QA-INFORME-002.md` (ningún otro archivo fue modificado) |
| Método | Re-ejecución completa de la suite y medición propia; **sin confiar** en los informes de DEV/SEC (solo se contrastan sus claims con evidencia medida) |

---

## 1. Resumen ejecutivo

Tras las correcciones DEV-001…DEV-004 y SEC-001, el producto **vuelve a pasar toda la
batería de verificación con 0 fallos**: `npm test` 310/310 (31 archivos; QA-001: 296/28),
`npm run lint` limpio, `npm run build` + `tsc --noEmit` exit 0, e2e **21/21** en mi corrida
(23 si se incluyen los 2 specs de capturas, que omito por restricción de escritura) y
offline real PWA **1/1** contra el build de producción.

Los 7 defectos abiertos en QA-001 están **cerrados con verificación propia**:

- **D-1 (demo con enlaces rotos):** mi conteo independiente sobre el disco da **23 wikilinks,
  0 sin destino** (12 archivos `.md`); el test de integridad sobre la muestra existe y
  falla si se degrada menos de lo necesario (razonado, §3.1).
- **D-2 (round-trip import/export):** existe `src/data/__tests__/backup.test.ts` (5 tests:
  reemplazar con igualdad total, fusionar, JSON inválido, forma inválida, conteos) **y** un
  e2e `backup-restore.spec.ts` que exporta → borra todo → reimporta → re-exporta idéntico.
  §11.1 cubierto; quedan lagunas menores inocuas (§3.3).
- **D-3 (desviación Capacitor):** declarada en `DECISIONES.md` §3.1 con honestidad y
  suficiencia (incluye el impacto en el Contrato §1.4/§1.6 y el alcance de una eventual
  eliminación). Cerrado. De paso, §3.2 declara también la desviación F-02 de SEC-001.
- **D-4 (escenarios §11.2 sin cobertura):** los tres NO CUBIERTO pasaron a cobertura e2e
  real (`today.spec.ts`, `backup-restore.spec.ts`) y los parciales ganaron `partials.spec.ts`
  (aviso de retiro, voucher, recurrencia de checklist, heatmap). Estado final: **13 CUBIERTO
  / 4 PARCIAL / 0 NO CUBIERTO** (§5.2). Los 4 parciales tienen huecos concretos y
  enumerados, todos menores.
- **D-5 (Lighthouse no verificable):** **sigue abierto** (menor). `docs/LIGHTHOUSE.md` es
  más honesto que antes (explica el 214,5 intermedio), pero sigue sin artefacto
  `lighthouse.json` en el workspace (glob → 0) y el CLI no puede instalarse sin red.
- **D-6 (cifras inconsistentes):** cerrado. Todas las cifras de README/RELEASE/DECISIONES/
  LIGHTHOUSE coinciden con mis mediciones: 310 tests/31 archivos · 23 e2e · precache 57 ·
  inicial **218,83 KB gzip** (redondean a 218,8) · demo "2 de sus 4 dominios" (honesto).
- **D-7 (contradicción F3.2):** cerrado. `DECISIONES.md` §4 ya no lo lista en "lo que
  quedó fuera": aclara "no queda fuera — F3.2 sí está implementada".
- **P-1 (stepMismatch en formularios numéricos):** cerrado. `StudyInlineForm` («Hoy»)
  usa `min=1, step=1, max=1440` + validación JS + botón deshabilitado; el e2e del
  escenario 12 guarda 30 con éxito en Chromium real; `ResourceFormModal` tiene tests
  unitarios que fijan `step=1` y guardan 7 minutos persistidos.

Las correcciones de SEC-001 están **presentes y probadas**: tope `[1, 10_000_000]` de
iteraciones con test de rechazo rápido (<2 s), 6 tests de crypto (incl. backward
compatibility: un `.enc` con 310 000 iteraciones sigue descifrando — cubierto por el
round-trip, §4), aviso de sync del vault ES/EN en Copy y VaultSection, guard de 5 MB en el
import de preguntas con test, `Referrer-Policy: no-referrer` en `serve.mjs` **y** meta
`referrer` en `index.html` (ambas presentes también en `dist/`). Sin regresiones: la CSP
sigue intacta en origen y build, el stub de `ResizeObserver` en `tests/setup.ts` es
benigno (solo-if-missing, no-op) y las claves i18n nuevas existen en ES y EN (paridad
11/11 + type-check).

**Veredicto: APTO como versión candidata a H3.** No hay defectos abiertos bloqueantes;
los 9 ítems abiertos son menores/informativos (§7) y 4 escenarios §11.2 quedan en PARCIAL
con huecos pequeños y documentados, no funcionales.

---

## 2. Evidencia de herramienta (comandos ejecutados y salida real)

### 2.1 `npm test` → **310/310 PASS en 31 archivos** (exit 0)

```
 RUN  v2.1.9  C:/Users/luis9/Documents/universidad/app web aws
  Test Files  31 passed (31)
       Tests  310 passed (310)
    Start at  00:52:27
    Duration  7.20s
EXITCODE=0
```

Nuevos respecto a QA-001 (+14 tests): `backup.test.ts (5)`, `backupCrypto.test.ts (6)`,
`ResourceFormModal.test.tsx (2)`, y `QuestionBankSection.test.tsx` pasó de 8 a 9 (test del
guard de 5 MB). Warnings de stderr: los mismos conocidos de QA-001 (React Router future
flags, dos `act(...)` en `RoadmapPage.test.tsx`, `[i18n] falta la clave "no.existe"` esperado
del test de fallback, y un aviso benigno de Dexie `deleteDatabase` en ResourceFormModal).
**Ningún test falla.** Efecto lateral declarado (idéntico a QA-001): el test del demo
reescribe `examples/vault-demo/` de forma determinista; mi conteo de integridad (§3.1) se
hizo **después** de esta regeneración.

### 2.2 `npm run lint` → **limpio** (exit 0)

```
> eslint .
EXITCODE_LINT=0
```

### 2.3 `npm run build` → **OK** (exit 0) + `npx tsc --noEmit` → limpio (exit 0)

```
> tsc -b && vite build
<script src="./theme-init.js"> in "/index.html" can't be bundled without type="module" attribute
✓ 2915 modules transformed.
(!) Some chunks are larger than 500 kB after minification...
dist/assets/index-D0HUBDGw.css   37.59 kB │ gzip:   8.25 kB
dist/assets/react-CW0rRIZ4.js   164.92 kB │ gzip:  53.82 kB
dist/assets/index-BaH9dRZp.js   516.87 kB │ gzip: 156.76 kB
✓ built in 6.92s
PWA v0.20.5 — precache 57 entries (2030.92 KiB)
EXITCODE_BUILD=0
EXITCODE_TSC=0
```

Avisos (no bloqueantes, mismos que QA-001): Vite con `theme-init.js` sin `type="module"`
(benigno y deliberado por la CSP `script-src 'self'`), y Rollup con chunk `index` >500 kB
minificado (516,87 kB min / **156,76 gzip**, dentro de presupuesto). `tsc` no emite
warnings.

### 2.4 E2E → **21/21 PASS en 32,2 s** (exit 0)

```
npx playwright test --grep-invert "pwa|local-server|shots"
Running 21 tests using 1 worker
  ok backup-restore.spec: «Borrar todo» exige doble confirmación y el respaldo restaura el estado exacto (6.3s)
  ok exports.spec ×3 (zip, ics, JSON)
  ok flows.spec ×9 (arranque, sesión, simulacro, checklist, autosave, idioma+tema, sin red, Hoy ver más, atajos, 360px)
  ok partials.spec ×4 (A retiro, B voucher, C recurrencia, D heatmap)
  ok questions.spec ×1 (banco CSV)
  ok today.spec ×2 (tema vencido 30 min/dominado, notificaciones denegadas)
  21 passed (32.2s)
EXITCODE=0
```

> **Nota metodológica (igual que QA-001):** `npm run test:e2e` ejecuta 23 pruebas; omito
> por política de escritura las 2 de `shots*.spec.ts` (reescriben `docs/shots/*.png` y
> `mockups/*.png`, fuera de mi permiso). No son pruebas funcionales: generan capturas.
> Conteos: 21 míos + 2 omitidas = 23, coherente con README/RELEASE/DECISIONES.
> `tests/e2e/local-server*.spec.ts` (2) quedan fuera de `test:e2e` por diseño del script.

### 2.5 Offline real (PWA) → **1/1 PASS** con evidencia propia

```
Start-Process cmd → npx vite preview --port 5184  →  HTTP 200 (localhost:5184)
$env:PWA_URL="http://localhost:5184"; npm run test:pwa
  ok 1 ... pwa-offline.spec.ts:18:1 › carga offline tras la primera visita (service worker) (4.8s)
  1 passed (8.6s)  EXITCODE_PWA=0
```

(Recarga con `context.setOffline(true)` contra el **build de producción** con service
worker; servidor detenido después.)

### 2.6 Reglas del contrato (greps propios sobre `src/`, excluyendo tests)

| Regla | Resultado |
|---|---|
| `fetch(`/`XMLHttpRequest`/`sendBeacon`/`WebSocket`/`EventSource` en `src/` | **0** |
| `console.log/debug/info` en `src/` | **0** |
| `#rrggbb`/`#rgb` en `src/**/*.{ts,tsx}` fuera de `tokens.css` | **1**: `src/app/prefs.tsx:72` (`#0A0B0D`/`#F6F3EC` para `meta[name=theme-color]`) — misma observación O-1 de QA-001, justificada (meta HTML no admite `var()`). Ver §7 Q-8 sobre el alcance de la regla ESLint |
| `@ts-ignore` / `eslint-disable` en `src/` | 1 `eslint-disable-next-line no-console` preexistente y documentado en `src/lib/i18n/translate.ts:54`; **ninguno nuevo** |
| TS strict | `tsconfig.json`: `"strict": true` · `npx tsc --noEmit` exit 0 |
| Dependencias nuevas | `git status --porcelain`: **`package.json` y `package-lock.json` NO modificados** desde la versión que revisé en QA-001; lectura directa: mismo set (deps de producción sin clientes HTTP; `@capacitor/*` preexistentes y ya declarados) |
| Strings JSX sin `t()` | test `no-hardcoded-strings.test.ts` 1/1 en verde (parte de `npm test`) |

### 2.7 Bundle inicial medido por QA (§11.3 ≤250 KB gzip)

```
Inicial = 156,76 (index-BaH9dRZp) + 53,82 (react-CW0rRIZ4) + 8,25 (CSS) = 218,83 KB gzip → ≤250 ✅
```

Mismo grafo estático que en QA-001: `dist/index.html` precarga entry + `modulepreload` de
React + CSS; pantallas y `recharts`/`zod`/`jszip` bajo demanda. El chunk `index` creció
0,16 kB gzip por las correcciones (516,47 → 516,87 kB min).

---

## 3. Verificación de los defectos de QA-001 y de SEC-001

### 3.1 D-1 — Integridad del vault de ejemplo (verificación propia, no del test)

Conteo con script propio (PowerShell, resolución por basename como Obsidian, manejando
alias `\|` escapado y anclas `#`) sobre **los `.md en disco** de `examples/vault-demo/`:

```
Archivos .md: 12 | Wikilinks: 23 | Sin destino: 0
```

Estructura (12 archivos, em dash U+2014 verificado por puntos de código en nombres):
`_Ruta AWS.md`, `_Checklist.md`, `_Calendario.md`, `SAA-C03 — …/{Resumen, Checklist}`,
`Dominios/01–02`, `Temas/×2`, `Sesiones/2026/×2`, `Simulacros/2026-10-16`. Los 12 están
rastreados en git. (QA-001 contó 13 archivos/55 links con 33 rotos; la muestra se
regeneró con degradación de enlaces — 12/23/0 es el estado actual medido.)

**El test existe y es significativo:** `tests/demo/vault-demo.test.ts:66-97` degrada la
muestra contra su set efectivo (`degradeLinks`) y aserciona `expect(broken).toEqual([])`
recorriendo todos los wikilinks escritos. **Razonamiento de mutación (sin dejar
cambios):** si se escribiera `file.content` sin degradar (mutación trivial), los enlaces a
las 11 certificaciones y dominios fuera de la muestra reaparecerían como `[[…]]` y
`broken` tendría entradas ⇒ test en rojo. La mutación inversa (romper un destino
válido) también falla la aserción. El test escribe exactamente lo que aserciona, así que
cubre el estado en disco por construcción. Veredicto: **D-1 CERRADO**.

### 3.2 D-2 — Round-trip import/export (`src/data/__tests__/backup.test.ts`)

5 tests sustantivos (todo en verde en mi corrida):

| Test | Qué verifica | ¿Pide §11.1? |
|---|---|---|
| «reemplazar: … importar deja exactamente el estado exportado» | Basura deliberada (nota junk) eliminada; `restored` **igualdad profunda** con el original (`toEqual`) | ✔ respaldo → borrar → importar → idénticos |
| «fusionar: gana el archivo por id y conserva las filas locales extra» | Edición local sobreescrita por el archivo; fila local extra conservada; resto de tablas idéntico | ✔ modos |
| «rechaza un archivo que no es JSON válido» | `{esto no es json` → error legible | ✔ rechazo |
| «rechaza un JSON con forma de respaldo inválida» | Forma ajena → «Esquema inválido» (zod) | ✔ rechazo |
| «el texto exportado trae conteos coherentes» | Conteos del parser vs estado | ✔ adicional |

Además, el e2e `backup-restore.spec.ts` hace el ciclo completo en navegador real:
exportar → «Borrar todo» con doble confirmación → verificar primer arranque → importar en
modo *Reemplazar* → re-exportar y `expect(restored.json.data).toEqual(original.json.data)`.
§11.1 queda **CUBIERTO**. **Lagunas menores (no bloqueantes):** el modo fusión solo se
ejercita a fondo en `notes` (el resto se compara tras reemplazar); no hay test de un
`.enc` pasando por el flujo UI de import (el decrypt unitario sí está); schemaVersion
futuro no se prueba explícitamente (zod lo rechazaría — inferido, no ejercitado).
Recomendaciones, no defectos. **D-2 CERRADO**.

### 3.3 D-3 — Desviación Capacitor en DECISIONES

`docs/DECISIONES.md` §3.1 (líneas 117-137): describe el estado previo (deps, scripts,
`android/`), reconoce la contradicción con §2.2 del PRD y el Contrato §1.4/§1.6, la
declara, delimita la superficie de uso (`import()` dinámico con fallback navegador) y
especifica el alcance de una eventual eliminación. Es **honest y suficiente**. De bonus,
§3.2 declara la desviación de producto F-02 (frase de paso sin gate al abrir) que SEC-001
pedía documentar. **D-3 CERRADO**.

### 3.4 D-4 / SEC-001 — Verificación por corrección

| Corrección | ¿Presente? | Evidencia medida |
|---|---|---|
| F-01: tope de iteraciones `[1, 10_000_000]` | ✔ | `backupCrypto.ts:19` (`MAX_PBKDF2_ITERATIONS = 10_000_000`), `:150-154` (entero, ≥1, ≤tope **antes de derivar**). Test «F-01: iteraciones abusivas (10¹² y 10⁷+1) se rechazan rápido, sin derivar» con aserción `elapsed < 2_000 ms` — en verde |
| F-05: tests de crypto | ✔ | `backupCrypto.test.ts` **6 tests**: round-trip, formato+iteraciones declaradas, frase incorrecta → `wrongPhrase`, sal/IV distintos por operación, 11 formas inválidas → `invalidFile`, rechazo rápido de iteraciones abusivas |
| Backward compatibility `.enc` 310 000 iter. | ✔ (cubierto por el round-trip) | Cifrar usa siempre `PBKDF2_ITERATIONS = 310_000` (test aserciona `kdf.iterations === 310_000`) y descifrar lo acepta (310 000 ∈ [1, 10 M]); el test «round-trip: cifra y descifra el mismo texto» **es** el caso `.enc` de 310 k. No hay un test aparte con el literal 310 000 en el archivo manipulado, pero el formato lo emite el propio `encryptBackup`, así que la compatibilidad quedó cubierta |
| F-03: aviso de sync del vault ES/EN | ✔ | Clave `exporter.vault.syncNote` en ES (`exporter.ts:109-110`) y EN (`:215-216`); renderizada en `CopySection.tsx:161` y `VaultSection.tsx:238`; paridad ES/EN validada (11/11) |
| F-04: guard de 5 MB en import de preguntas | ✔ | `QuestionBankSection.tsx:46-47` (`MAX_IMPORT_BYTES = 5 * 1024 * 1024`), chequeo en `:225` **antes** de `file.text()`; test «rechaza un archivo de import mayor que 5 MB sin leerlo (F-04)» (6 MB simulados) aserciona «El archivo supera el límite de 5 MB.» |
| F-06: `Referrer-Policy`/meta referrer | ✔ | `scripts/serve.mjs:86` `'Referrer-Policy': 'no-referrer'`; `index.html:11` `<meta name="referrer" content="no-referrer">`; ambas presentes en `dist/index.html` (verificado) |

### 3.5 P-1 — El form de «Hoy» guarda con valor por defecto y con valor arbitrario

**Causa original:** `step={5}` con `min={1}` y default 30 ⇒ `stepMismatch` ⇒ Chromium no
emite `submit`. Estado actual de `StudyInlineForm.tsx` (mini-registro en línea de «Hoy»):

- Atributos: `min={1}`, `max={1440}`, `step={1}` (`:70-72`) ⇒ la escala nativa
  `min + n·step` cubre **todo entero positivo**: 30 ✔, 7 ✔, 1440 ✔. Coherente con la
  validación de la app: `validMinutes = isFinite && >0 && ≤1440` (`:46`), que replica el
  rango nativo; el botón submit está deshabilitado si no valida (`:126`) y `submit()`
  revalida (`:48-51`).
- **Valor por defecto sin tocar minutos:** `useState(String(defaultMinutes))` (`:41`) con
  `defaultMinutes = topicMinutes(topic, state)` (`TodayPage.tsx:167`), cuyo fallback es
  `DEFAULT_TOPIC_MINUTES = 30` (`minutes.ts:10,33`). Con 30 en el campo, `validMinutes`
  es true y el botón queda habilitado; al enviar, `onSave({minutes: 30, …})`. Es un
  step-múltiplo válido (30 = 1 + 29·1) ⇒ sin `stepMismatch` ⇒ el `submit` se emite.
- **Valor arbitrario 7:** 7 = 1 + 6·1 ⇒ válido nativa y por JS.
- **Evidencia de corrida:** el e2e del escenario 12 (`today.spec.ts:86`, en mi corrida
  **ok**) abre el form de un tema vencido, escribe 30, elige confianza 5, guarda y aserciona
  «Estudio guardado · 30 min · próxima revisión» + persistencia en IndexedDB — en Chromium
  real, donde la constraint validation sí actúa. El patrón arreglado se fija además en
  `ResourceFormModal.test.tsx` (clase P-1): aserción explícita de `step=1` con
  `coversStep(7/30/1440)` y guardado real de **7 minutos** persistidos.
- **Hueco (recomendación, no defecto):** ningún test ejercita el envío **sin tocar** el
  campo (default 30 intacto). Por razonamiento es seguro (arriba); si se quiere fijar,
  un caso en el e2e actual bastaría. **No modifiqué el spec** (restricción de esta tarea).

**P-1 CERRADO.**

### 3.6 Regresiones introducidas por las correcciones (7b)

| Revisión | Veredicto |
|---|---|
| `ResizeObserver` en `tests/setup.ts` | **Benigno.** Stub solo si la propiedad no existe (jsdom no la implementa), con `observe/unobserve/disconnect` no-op. No altera lógica de app ni aserciones (ningún test depende de tamaños medidos); solo evita que los hooks de tamaño de radix-ui revienten al renderizar modales. Los e2e corren en Chromium real con `ResizeObserver` nativo ⇒ las pruebas no se debilitan |
| Meta `referrer` y CSP | CSP intacta en `index.html:6-9` (idéntica a la de QA-001/SEC-001) y **sobrevive al build** (`dist/index.html` contiene ambas metas). `script-src 'self'` sin `unsafe-inline`; `theme-init.js` sigue cargando bien |
| Claves i18n nuevas ES/EN | `exporter.vault.syncNote` (ES/EN) y `practice.bank.import.fileTooBig` (ES/EN) verificadas por grep; el test de paridad (11/11) y el tipo `defineNamespace` (que **no compila** si falta EN) las blindan. Ambos tests en verde |
| Dependencias | Ninguna nueva (git + lectura directa, §2.6) |

---

## 4. §11.1 — Tests unitarios obligatorios (estado final)

Los 18 ítems exigidos, re-verificados contra los archivos reales y la corrida verde:

| # | Ítem | Estado | Evidencia (medida) |
|---|---|:--:|---|
| 1 | `readiness()` con 6 casos | **CUBIERTO** | `readiness.test.ts` (10 tests, verde) |
| 2 | `estimatedScore()` | **CUBIERTO** | `scoring.test.ts` (11) |
| 3 | `nextRecommended()` con prerrequisitos y `retiring` | **CUBIERTO** | `recommend.test.ts` (17) |
| 4 | `sm2()` con 4 secuencias | **CUBIERTO** | `sm2.test.ts` (8) |
| 5 | `costoRutaRestante()` con y sin vouchers | **CUBIERTO** | `budget.test.ts` (12) |
| 6 | Migración Dexie v1 | **CUBIERTO** | `migrations.test.ts` (4) |
| 7 | **Import/export round-trip** | **CUBIERTO** ✨ | `backup.test.ts` (5: reemplazar/fusionar/JSON inválido/forma inválida/conteos) + e2e `backup-restore.spec.ts` (exportar→borrar→importar→idéntico) |
| 8 | `scheduleTopic()` 4 ramas + `dominado` | **CUBIERTO** | `schedule.test.ts` (23) |
| 9 | `buildReminders()` (prioridad, tope, silencio, dedup, studyDays) | **CUBIERTO** | `reminders.test.ts` (17) |
| 10 | `buildVault()` snapshot/idempotencia/frontmatter | **CUBIERTO** | `obsidian.test.ts` + snapshot (28) |
| 11 | `renderNote()` / integridad de wikilinks | **CUBIERTO** | obsidian.test.ts (integridad + degradación) |
| 12 | `buildIcs()` (ical.js, UID, VALARM, ≤75 octetos, CRLF, Bogotá) | **CUBIERTO** | `ics.test.ts` (32) |
| 13 | `sanitizeFilename()` | **CUBIERTO** | obsidian.test.ts |
| 14 | `clipboard` mock + fallback | **CUBIERTO** | `clipboard.test.ts` (5) |
| 15 | Paridad ES/EN | **CUBIERTO** | `parity.test.ts` (11) |
| 16 | Sin strings hardcodeados en JSX | **CUBIERTO** | `no-hardcoded-strings.test.ts` (1) |
| 17 | Formatos es-CO/en-US | **CUBIERTO** | `format.test.ts` (19) |
| 18 | Tema `system` con matchMedia mockeado | **CUBIERTO** | `theme.test.tsx` (8) |

**Resultado: 18/18 CUBIERTO** (QA-001: 17/18). Además, fuera del mínimo exigido pero
verificado: crypto (6) y ResourceFormModal P-1 (2).

---

## 5. §11.2 — Escenarios de aceptación (estado final, 17/17)

| # | Escenario | Estado | Cobertura medida en mi corrida |
|---|---|:--:|---|
| 1 | Primer arranque con semilla (13/12, CLF recomendada, SAA bloqueada) | **CUBIERTO** | e2e `flows.spec:5` (ok) |
| 2 | Registrar sesión (heatmap, horas +45, racha) | **PARCIAL** | Heatmap: e2e `partials.spec:126` aserciona la celda de hoy «45 min» y «0,8 h» (ok). Horas semanales: `flows.spec:17` (ok). **Racha: solo unit** (`stats.test.ts`) — no se afirma en e2e |
| 3 | Simulacro 46/65 → 737 vs 720 | **CUBIERTO** | e2e `flows.spec:34` (ok). Desglose por dominio persiste en unit |
| 4 | Voucher del 50 % (150→75) | **CUBIERTO** ✨ | e2e `partials.spec:36` (ok): voucher vigente abarata AIF-C01 100→50 y, con un segundo voucher, SAA-C03 150→75 en la proyección. La creación del voucher desde la aprobación de CLF-C02 sigue en unit (`voucherFromApproval`) |
| 5 | Respaldo y restauración | **CUBIERTO** ✨ | e2e `backup-restore.spec:42` (ok): exportar → borrar todo (doble confirmación) → importar reemplazando → `data` idéntico. + unit round-trip |
| 6 | Sin red | **CUBIERTO** | e2e `flows.spec:94` (ok) + PWA offline 1/1 (mi corrida, §2.5) |
| 7 | Aviso de retiro ANS-C01 ≤120 d | **CUBIERTO** ✨ | e2e `partials.spec:24` (ok): banner «Se retira el 31 dic 2026 · ANS-C01» en Ruta + detalle en la página de la certificación |
| 8 | Checklist plantilla + recurrencia | **CUBIERTO** ✨ | e2e `flows.spec:52` (8 ítems, 0→1 de 8) + `partials.spec:65` (ok): ítem semanal completado crea la siguiente instancia con `dueDate` +7 verificado en IndexedDB |
| 9 | Nota con autosave | **CUBIERTO** | e2e `flows.spec:63` (ok) |
| 10 | Copiar certificación para Obsidian (frontmatter, wikilinks, sin HTML) | **PARCIAL** | Unit sólido (frontmatter, integridad `[[`, sin HTML crudo); **sin e2e de portapapeles/frontmatter** (igual que en QA-001) |
| 11 | Exportar vault completo (.zip, links OK, UTF-8) | **CUBIERTO** | e2e `exports.spec:6` (ok) + unit integridad |
| 12 | Recordatorio de tema vencido | **PARCIAL** (fuertemente mejorado) | e2e `today.spec:86` (ok): tema vencido en el primer bloque de «Hoy», contador baja, confianza 5 ⇒ sesión de **30 min** guardada, persistencia (`status: dominado`, `reviewCount: 3`, `nextReviewAt` +30 d) — rama del tercer repaso §8.7. **Huecos:** el «badge de la navegación muestra 1» no se afirma (sí el contador de «Hoy»); la rama literal «repasando con próxima revisión en 7 días» (repasos previos menores) solo está en unit `schedule.test.ts` |
| 13 | Notificaciones denegadas | **PARCIAL** (mejorado) | e2e `today.spec:131` (ok): `Notification.permission='denied'` vía initScript ⇒ banner «Las notificaciones están denegadas» + botón «Exportar .ics». **Hueco:** «los recordatorios siguen apareciendo en “Hoy”» no se afirma en e2e (la lógica está en unit `reminders`/`today`) |
| 14 | Calendario .ics (6 eventos, UID, alarma) | **CUBIERTO** | unit `ics.test.ts` + e2e `exports.spec:39` (ok) |
| 15 | Cambiar de idioma | **CUBIERTO** | e2e `flows.spec:74` (ok) |
| 16 | Cambiar de tema | **CUBIERTO** | e2e `flows.spec:74` + unit `theme.test.tsx` (el sin destello sigue sin test explícito; `theme-init.js` lo garantiza — aceptado como en QA-001) |
| 17 | Layout 360 px ES/EN | **CUBIERTO** | e2e `flows.spec:144` (ok) |

**Resultado: 13 CUBIERTO / 4 PARCIAL / 0 NO CUBIERTO** (QA-001: 9/5/3).
Los parciales restantes son huecos de aserción concretos y menores (racha, portapapeles,
badge de nav, rama «repasando», recordatorios-en-Hoy-bajo-denegación); ninguno es un
camino sin probar ni un fallo funcional.

---

## 6. §11.3 — Definición de terminado y §12 (estado final)

| Criterio | Estado | Evidencia medida |
|---|:--:|---|
| Build sin errores ni warnings de **TypeScript**; test verde; lint limpio | **CUBIERTO** | §2.1-2.3: 310/310, lint 0, `tsc -b`/`tsc --noEmit` 0. Avisos Vite/Rollup benignos y documentados |
| Lighthouse móvil ≥90 (Perf/A11y/BP) | **NO VERIFICABLE** | Sigue sin artefacto `lighthouse.json` (glob → 0) y sin CLI instalable (red prohibida). `docs/LIGHTHOUSE.md` es reproducible y ahora explica honestamente el 214,5 intermedio. **D-5 abierto (menor)** |
| Bundle inicial ≤250 KB gzip | **CUBIERTO** | **218,83 KB gzip** medido (§2.7) |
| Offline tras la primera carga | **CUBIERTO** | Mi corrida: e2e «sin red» ok + PWA offline 1/1 contra `vite preview` del build |
| Vault exportado se abre en Obsidian sin enlaces roscos | **CUBIERTO** | Mi conteo: 0/23 rotos en `examples/vault-demo/` + test de integridad (export completo y muestra) + 8 capturas en `docs/shots/` |
| `.ics` en zona horaria correcta | **CUBIERTO** | unit VTIMEZONE/ical.js + e2e con `TZID:America/Bogota` (la importación real en Google Calendar queda manual, aceptada por el PRD) |
| 4 combinaciones ES/EN × oscuro/claro sin strings sin traducir | **CUBIERTO** | Capturas 01/02/07/08 en `docs/shots/` (8 PNG verificados en disco) + paridad 11/11 + heurística JSX + e2e idioma/tema/360 px |
| Contraste AA en 6 pares críticos documentado | **CUBIERTO** | `DECISIONES.md` §5; recálculo independiente de QA-001 coincide (tabla numérica sin cambios) |
| README con los 6 puntos | **CUBIERTO** | Las 6 secciones presentes (QA-001); cifras actualizadas (310/23) |
| `docs/DECISIONES.md` + `docs/PLANTILLAS-OBSIDIAN.md` | **CUBIERTO** | DECISIONES ahora incluye §3.1 Capacitor, §3.2 frase de paso, checklist §6 sin filas rotas y cifras coherentes; PLANTILLAS intacto |

**§12:** vault de ejemplo **CUBIERTO** (12 archivos, 0 enlaces rotos, estructura Anexo C) ·
4+ capturas **CUBIERTO** (8) · «lo que no hice y por qué» **CUBIERTO** (§4, con F3.2 ya
corregido) · árbol/comandos/decisiones/checklist **CUBIERTO** (README + DECISIONES §6).

---

## 7. Defectos: tabla completa (QA-001 + P-1 + SEC-001 + nuevos de esta corrida)

### Cerrados en esta re-verificación

| ID | Sev. | Estado | Qué se verificó |
|---|---|---|---|
| **D-1** | mayor | **CERRADO** | Demo sin enlaces rotos: 0/23 (conteo propio) + test de integridad con mutación que lo haría fallar (§3.1) |
| **D-2** | mayor | **CERRADO** | `backup.test.ts` (5) + e2e round-trip completo; §11.1 item 7 cubierto (§3.2). Lagunas menores anotadas como recomendación |
| **D-3** | mayor | **CERRADO** | `DECISIONES.md` §3.1 declara la desviación Capacitor con honestidad y alcance (§3.3) |
| **D-4** | menor | **CERRADO** | §11.2 pasa de 9/5/3 a **13/4/0**; escenarios 5, 12 y 13 con e2e real; parciales ganaron `partials.spec.ts` (§5) |
| **D-6** | menor | **CERRADO** | Todas las cifras documentales coinciden con mis mediciones (§8) |
| **D-7** | menor | **CERRADO** | `DECISIONES.md` §4 ya no contradice §1.15 sobre F3.2 |
| **P-1** | prod. | **CERRADO** | `StudyInlineForm` `min=1/step=1/max=1440` + validación JS; e2e guarda 30 en Chromium; `ResourceFormModal` fija step=1 y guarda 7 (§3.5) |
| **F-01** (SEC) | medio | **CERRADO** | Tope `[1, 10_000_000]` antes de derivar + test de rechazo <2 s (§3.4) |
| **F-03** (SEC) | bajo | **CERRADO** | Aviso de sync del vault ES/EN en Copy y VaultSection (§3.4) |
| **F-04** (SEC) | bajo | **CERRADO** | Guard 5 MB antes de leer + test con 6 MB (§3.4) |
| **F-05** (SEC) | bajo | **CERRADO** | 6 tests de `backupCrypto.ts` (§3.4) |
| **F-06** (SEC) | bajo | **CERRADO** | `Referrer-Policy: no-referrer` en `serve.mjs` + meta referrer en `index.html` y `dist/` (§3.4) |
| **F-02** (SEC) | medio | **CERRADO (declarado)** | La desviación §7.8 queda documentada en `DECISIONES.md` §3.2; la implementación del gate queda fuera por decisión de producto, explícitamente |

### Abiertos (todos menores/informativos; **ninguno bloqueante**)

| ID | Sev. | Defecto | Acción sugerida |
|---|---|---|---|
| **D-5** | menor | Claim de Lighthouse ≥90 sigue sin evidencia retenida: sin `lighthouse.json` en el workspace (glob → 0); no ejecutable sin red | Adjuntar el artefacto JSON del orquestador al repo o aceptarlo como verificación externa en H3 |
| **Q-1** | menor | Escenario 12: badge de la navegación «muestra 1» no asertado en e2e; rama «repasando +7 días» solo unit | Añadir aserción del badge y/o un caso con `reviewCount: 1` en `today.spec.ts` |
| **Q-2** | menor | Escenario 13: «los recordatorios siguen apareciendo en Hoy» no asertado bajo permiso denegado | Extender `today.spec:131` con una visita a `/#/hoy` |
| **Q-3** | menor | Escenario 2: «la racha se mantiene» sin aserción e2e (heatmap y horas sí) | Afirmar el texto de racha en `partials.spec:126` |
| **Q-4** | menor | Escenario 10 (copiar para Obsidian) sigue sin e2e de portapapeles/frontmatter | e2e con `navigator.clipboard` mockeado |
| **Q-5** | bajo | `StudyInlineForm`: ningún test ejercita el envío con el valor por defecto **sin tocar** el campo (razonado seguro, §3.5) | Caso extra en el e2e existente |
| **Q-6** | informativo | Aviso de Rollup: chunk `index` 516,87 kB min (>500) — 156,76 kB gzip, dentro de presupuesto | Opcional: `chunkSizeWarningLimit` o manualChunks |
| **Q-7** | informativo | La regla ESLint de hex cubre `src/features/**` y `src/components/**` pero no `src/app/**`; el único hex (prefs.tsx:72, meta theme-color) queda fuera de la regla (aunque documentado y mi grep manual lo confirmó único) | Ampliar el alcance de la regla o explicitar la excepción en DECISIONES |
| **Q-8** | informativo | El flujo de importación de un `.enc` por la UI no tiene e2e (el decrypt unitario sí) | e2e opcional del export/import cifrado |

---

## 8. Discrepancias entre documentación y mediciones

| Cifra | Documento | Mi medición | Estado |
|---|---|---|---|
| Tests unitarios | README 310/31 · RELEASE 310/31 · DECISIONES 310/31 | **310/31** | ✅ coincide |
| E2E | README/RELEASE/DECISIONES/DECISIONES-§6: 23 | **21 míos + 2 omitidas (shots) = 23** | ✅ coincide |
| Bundle inicial | DECISIONES §3/§6, LIGHTHOUSE: 218,8 KB gzip | **218,83** (156,76+53,82+8,25) | ✅ coincide (redondeo) |
| Precache | DECISIONES §6/§7: 57 entradas | **57 entries (2030,92 KiB)** | ✅ coincide |
| Demo | DECISIONES §7: «2 de sus 4 dominios» | 12 archivos, 2 dominios de muestra | ✅ honesto |
| 214,5 KB (LIGHTHOUSE, nota) | explicado como medición intermedia | — | ✅ reconciliado con transparencia |
| Conteo del demo en QA-001 | «13 archivos .md» (histórico) | **12 en disco** (rastreados en git) | ⚠️ informativo: la muestra cambió con la corrección D-1; no es una discrepancia de la documentación actual |

**No quedan discrepancias numéricas abiertas** entre README/RELEASE/DECISIONES/LIGHTHOUSE
y mis mediciones. La única evidencia faltante sigue siendo el artefacto de Lighthouse (D-5).

---

## 9. Veredicto

**¿Apto como versión candidata a H3? SÍ.**

- Los 3 comandos obligatorios pasan con salida recogida y 0 fallos (unit 310/310, lint 0,
  build 0, tsc 0); e2e 21/21 en mi corrida (23 del script completo) y offline real PWA 1/1.
- Los 7 defectos de QA-001 y los 6 hallazgos corregibles de SEC-001 están cerrados con
  verificación propia; §11.1 queda 18/18 y §11.2 en 13/4/0 sin NO CUBIERTO.
- **Defectos abiertos:** D-5 (menor, evidencia de Lighthouse) + Q-1…Q-8 (menores e
  informativos de aserción/alcance). **Ninguno bloqueante**: ninguno afecta a la
  funcionalidad, la seguridad ni los criterios duros; los parciales de §11.2 son huecos de
  aserción sobre lógica ya probada en unit.
- Riesgo residual igual que en QA-001 (una prueba verde no es garantía): sin auditoría de
  navegador en Safari/Firefox, sin `npm audit` (requiere red/aprobación), sin inspección
  del APK y con la verificación de «sin destello» y del aspecto en Obsidian aún manuales.

### Limitaciones de esta corrida

- Omití por política de escritura los 2 specs de capturas (`shots*.spec.ts`, 2 pruebas);
  el resto de `npm run test:e2e` corrió íntegro.
- No ejecuté `local-server*.spec.ts` (2, fuera de `test:e2e` por diseño del script).
- Lighthouse y `npm audit` siguen siendo no ejecutables en este entorno (red).
- El stub de `ResizeObserver` y la meta referrer se revisaron estáticamente; sus efectos
  dinámicos solo se observan en los e2e (que pasan).

### Siguiente paso recomendado

Proponer a H3 este estado como candidato; si se quiere cerrar del todo §11.2, una pasada
breve puede añadir las aserciones Q-1/Q-2/Q-3 (badge, recordatorios-en-Hoy, racha) sin
tocar producto. Adjuntar `lighthouse.json` si el orquestador lo conserva.

---

## 10. Resultado del contrato

```
task_id: QA-002
status: completed
summary: Re-verificación independiente tras DEV-001…DEV-004 y SEC-001. Suite completa en verde con salida recogida: unit 310/310 (31 archivos), lint 0, build 0, tsc 0, e2e 21/21 (23 con las 2 capturas omitidas por política de escritura), PWA offline 1/1. Los 7 defectos de QA-001 (D-1…D-4, D-6, D-7 y P-1) y los hallazgos corregibles de SEC-001 (F-01, F-03, F-04, F-05, F-06; F-02 declarada) están CERRADOS con verificación propia. §11.1: 18/18 CUBIERTO. §11.2: 13 CUBIERTO / 4 PARCIAL / 0 NO CUBIERTO. §11.3 y §12 cumplidos salvo Lighthouse (sigue NO VERIFICABLE sin artefacto). Cifras de README/RELEASE/DECISIONES/LIGHTHOUSE coinciden con mis mediciones.
tests: ejecutados 332 (310 unit + 21 e2e + 1 pwa) · pasados 332 · fallidos 0 · omitidos 2 (specs de capturas, por restricción de escritura) · no ejecutados 2 (local-server, fuera de test:e2e por diseño)
defects_closed: D-1, D-2, D-3, D-4, D-6, D-7, P-1, F-01, F-02(declarada), F-03, F-04, F-05, F-06
defects_open: D-5 (menor: artefacto Lighthouse ausente) · Q-1..Q-4 (menores: aserciones faltantes en escenarios 2, 10, 12, 13) · Q-5 (bajo: submit con default sin test) · Q-6..Q-8 (informativos: warning chunk>500kB, alcance regla hex ESLint en src/app, sin e2e del import .enc por UI)
section_11_status: §11.1 18/18 CUBIERTO · §11.2 13 CUBIERTO / 4 PARCIAL / 0 NO CUBIERTO · §11.3 CUBIERTO salvo Lighthouse NO VERIFICABLE · §12 CUBIERTO
discrepancias: ninguna numérica abierta (310/31 · 23 e2e · 218,83≈218,8 KB gzip · precache 57 · demo 2 de 4 dominios — todo coincide). Informativo: el demo pasó de 13 a 12 archivos .md con la corrección D-1 (QA-001 era histórico)
verdict: candidato H3: SÍ — sin defectos bloqueantes; los abiertos son menores/informativos
limitations: specs de capturas omitidos (2); local-server no ejecutado (2, fuera del script); Lighthouse y npm audit no ejecutables sin red; verificación de "sin destello" y aspecto en Obsidian sigue manual
recommended_next_step: proponer H3 con este estado; opcional: aserciones Q-1/Q-2/Q-3 y adjuntar lighthouse.json si existe fuera del workspace
approval_required: false
```

**Archivo generado:** `docs/QA-INFORME-002.md` (único archivo escrito por esta tarea; no se
modificó código, tests ni ningún otro documento).
