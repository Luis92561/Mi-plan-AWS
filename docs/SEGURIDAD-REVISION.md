# SEC-001 — Revisión de seguridad de «Mi Plan AWS» vs §10 del PRD

| Campo | Valor |
|---|---|
| **task_id** | SEC-001 |
| **status** | completed |
| **agent** | security |
| **fecha** | 2026-10-19 |
| **alcance** | Estado actual del producto (app local-first PWA, v1.2.1) contra §10 (Privacidad y seguridad) y §2/§3 del PRD `prompts/prompt-app-plan-aws.md`, contrastado con `docs/SECURITY.md` |
| **archivos modificados** | **Solo** `docs/SEGURIDAD-REVISION.md` (este informe). No se tocó código de producto. `git status --porcelain` antes de escribir: 22 entradas ya modificadas/nuevas por otros agentes (preexistentes a esta sesión); tras escribir este informe se añade únicamente este archivo. |

---

## 1. Resumen ejecutivo (summary)

La aplicación **cumple de forma verificable la regla de oro de §10 (cero red en runtime)** y la mayor parte de los controles declarados en `docs/SECURITY.md`: CSP estricta presente en `index.html` y preservada en el build, Markdown sin HTML crudo, import de respaldos validado con zod y límite de 20 MB, doble confirmación en «Borrar todo», frase de paso que usa WebCrypto con parámetros correctos (PBKDF2-SHA256 310 000 iteraciones, sal e IV aleatorios por operación, AES-GCM 256, clave no extraíble) y sin secretos en el repo (ni `.env`, ni claves de Android versionadas).

No hay hallazgos **críticos** ni **altos**. Se documentan 2 hallazgos **medios** (frase de paso que no protege los datos vivos pese a pedirlo §7.8; iteraciones PBKDF2 sin tope en el descifrado de archivos `.enc` ajenos) y varios **bajos/informativos**, la mayoría aceptables como decisión de producto para una app personal local-first. **Veredicto: no hay bloqueantes para entregar este MVP como app local-first de uso personal**, con las recomendaciones de §6.

---

## 2. Verificación «cero red» (contraste con la afirmación del equipo)

`docs/SECURITY.md:31` afirma «cero `fetch` en runtime». Verificación por búsqueda explícita:

| Búsqueda (Grep sobre `src/`) | Resultado |
|---|---|
| `fetch(\|XMLHttpRequest\|WebSocket\|EventSource\|sendBeacon\|axios` | **0 coincidencias** |
| `dangerouslySetInnerHTML\|innerHTML\|eval(\|new Function\|document.write` | **0 coincidencias** |
| `https?://` en `src/` | 45 coincidencias, **todas datos/enlaces**: semilla (`src/data/seed.ts:60–728`, `officialUrl`/`url` de certificaciones y recursos), fixtures y snapshots de tests. Ninguna es una petición. |

Contraste con build compilado (`dist/`):

- `Select-String dist\assets\*.js -Pattern "XMLHttpRequest\|sendBeacon\|WebSocket"` → **0**.
- `fetch(` aparece en 3 bundles con contexto `e.url` / `webFetchExtra` (p. ej. `dist/assets/index-CXS0d4JY.js`: `n=await fetch(s,t)`), originado en el **bundle de Dexie** (helpers URL de su módulo cloud/sync, código muerto: `src/data/db.ts:74–80` crea un `new Dexie(name)` plano, sin nube ni sync configurados, y `dexie-cloud` no está en `package.json`). Aun si se invocara, la CSP `connect-src 'self'` bloquea cualquier destino externo (ver §3).
- `dist/sw.js` (4154 bytes, precache de Workbox): sin `runtimeCaching`, sin rutas a `google-analytics`/`googletagmanager`/`workbox-google-analytics` (búsqueda en el archivo: 0 coincidencias). `vite.config.ts:33–37` solo define `globPatterns`, `navigateFallback`, `cleanupOutdatedCaches`.
- Etiquetas remotas: `index.html` solo referencia `./favicon.svg` y `./theme-init.js` (locales); `src/styles/index.css:1` solo `@import './tokens.css'` (relativo). Tipografías self-hosted vía `@fontsource/*` (`package.json:35–36`).
- Enlaces externos: todos `target="_blank" rel="noopener"` (`src/features/certification/components/SummaryTab.tsx:126,129`, `ResourcesTab.tsx:43–44`, `CertHeader.tsx:89,92`, `src/features/resources/components/ResourceLedger.tsx:92–93`, `src/features/roadmap/components/PhaseZero.tsx:65–66`); en Markdown, `rel="noopener noreferrer"` (`MarkdownPreview.tsx:64`).

**Veredicto del punto:** la afirmación del equipo es **cierta y verificada** (código de app y build). Salvedad informativa: los bundles incluyen código `fetch` muerto de Dexie (§4, F-13).

## 3. CSP y cabeceras

- CSP presente como meta en `index.html:6–9` y **sobrevive al build** (`dist/index.html` contiene `http-equiv="Content-Security-Policy"`): `default-src 'self'; base-uri 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; form-action 'none'; object-src 'none'`. Es **igual o más estricta** que la de §10 del PRD (que no pedía `font-src`, `object-src 'none'`, `base-uri` ni `form-action`).
- `theme-init.js` es archivo propio externo (`public/theme-init.js`, cargado en `index.html:16`) compatible con `script-src 'self'`; usa `try/catch` y no escribe HTML (`public/theme-init.js:7–36`).
- `scripts/serve.mjs:85` envía `X-Content-Type-Options: nosniff`. **No** envía `Referrer-Policy` ni otras cabeceras defensivas; la CSP va solo por meta (una meta-CSP no admite `frame-ancestors`/`report-uri`). Riesgo residual bajo: la app se sirve desde `localhost`/LAN y los enlaces salientes añaden `rel="noopener"`.
- Service worker: generado por `vite-plugin-pwa` con `scope` heredado de `base: './'` (`vite.config.ts:7,23`); `serve.mjs:84` envía `Service-Worker-Allowed: '/'` (permite alcance raíz, coherente con `sw.js` en raíz; no amplía superficie real).

## 4. Criptografía (frase de paso)

`src/features/settings/backupCrypto.ts` (leído completo):

| Aspecto | Evidencia | Evaluación |
|---|---|---|
| PBKDF2-SHA256, ≥310 000 iteraciones | `backupCrypto.ts:13` (`PBKDF2_ITERATIONS = 310_000`), `:86` (`hash: 'SHA-256'`) | ✅ cumple §10 |
| Sal aleatoria de 16 B **por operación** | `:103` (`crypto.getRandomValues(new Uint8Array(SALT_BYTES))`) | ✅ sin salt fijo |
| IV aleatorio de 12 B **por operación** | `:104` | ✅ sin reutilización de IV |
| AES-GCM 256, clave no extraíble | `:88–90` (`length: 256`, extractable `false`) | ✅ |
| La frase nunca se guarda | solo estado React durante el modal (`BackupSection.tsx:78,524–528`); sin persistencia en IDB/localStorage (grep `passphrase` sin almacenamiento) | ✅ |
| Normalización NFC de la frase | `:80` (`phrase.normalize('NFC')`) | ✅ |
| Sin tope superior de iteraciones al **descifrar** | `:142–144` acepta `iterations` del archivo con solo `>= 1` | ⚠️ F-01 (medio) |
| Sin tests unitarios del módulo | grep `encryptBackup\|decryptBackup\|PBKDF2` en `*.test.*` → **0** | ⚠️ F-05 (bajo) |

**Gesto de producto detectado (F-02):** §7.8 del PRD pide «si se activa, pide la frase al abrir». La implementación solo usa `passphraseEnabled` para habilitar el botón de exportar cifrado (`BackupSection.tsx:362,382`); **no hay gate de apertura** (grep `passphraseEnabled|PassphraseGate` en `src/` solo muestra settings/backup UI). `docs/SECURITY.md:5–8` lo reencuadra honestamente (frase solo para el respaldo exportado), pero la desviación no está en `docs/DECISIONES.md` (grep `frase|passphrase` → 0). Nota: un gate de UI no cifraría IndexedDB (datos vivos en claro por diseño del navegador), pero el requisito del PRD quedaría incumplido sin declarar.

## 5. Persistencia, fugas, import/export y XSS

**Persistencia.** Datos de negocio solo en IndexedDB `miplan-aws` (14 tablas, `src/data/db.ts:21–72`). `localStorage` solo preferencias/UI verificadas: tema/idioma/tipografía (`src/app/prefs.tsx:38,103`), vista de ruta (`src/features/roadmap/helpers.ts:13,22`), `SEQUENCE` del ICS (`src/features/reminders/permission.ts:59,71`), fecha del último respaldo (`src/features/settings/helpers.ts:23,32`). **Sin secretos ni datos de negocio en localStorage** (verificación grep `localStorage` — 19 coincidencias, todas las anteriores).

**Import de respaldo (F-04 verificado, sin hallazgo).** Límite 20 MB en dos capas: `file.size` en `BackupSection.tsx:143` y `text.length` en `src/data/schemas.ts:285` (`MAX_BACKUP_BYTES`, `schemas.ts:6`). Esquema zod estricto por tabla (`schemas.ts:247–270`), sin ejecutar nada del archivo (`backup.ts:122` solo hace `bulkPut` de datos validados). Flujo: previsualización con conteos + selector de modo **fusionar (default) / reemplazar** con pista explícita («Vacía las tablas y deja exactamente el archivo») + botón de confirmación (`BackupSection.tsx:162–163,410–477`; textos `settings.ts:122`). **«Reemplazar todo» sí requiere confirmación explícita** (radio + confirmar); la doble confirmación con palabra tipeada (`BORRAR`) existe solo para el borrado total (`DangerSection.tsx:24–37,100–117`; `settings.ts:177`). Aceptable como decisión de producto; el borrado total es el más protegido y es correcto.

**Export/vault/ICS.** `.zip` e `.ics` en memoria (`backup.ts:153–171`, `IcsExportCard.tsx:41–43`). El ICS exige casilla de confirmación y aviso de información personal (`IcsExportCard.tsx:34–38,65–90`; `reminders.ts:92–95`). El vault sanea nombres (`obsidian.ts:64`, con test en `obsidian.test.ts:37–69`), limpia HTML crudo del Markdown del usuario (`obsidian.ts:526–533,1757–1763`) y degrada wikilinks sin destino (`obsidian.ts:1735–1755`, test de integridad `obsidian.test.ts:177`). **Discrepancia (F-03, bajo):** `SECURITY.md:12–13` afirma que «al exportar se avisa que el contenido sale del dispositivo por decisión del usuario»; la UI solo dice «Copiar y exportar es 100 % local» y «Obsidian no fusiona carpetas» (`exporter.ts:98,108`) — no hay aviso explícito sobre vaults sincronizados a la nube.

**Import del banco de preguntas (F-04, bajo).** `QuestionBankSection.tsx:218–235` lee el archivo sin límite de tamaño y parsea con `parseQuestionsJson/parseQuestionsCsv` (`src/domain/questions.ts:137–269`, validación campo a campo, sin ejecutar nada). Inconsistente con el límite de 20 MB del respaldo; DoS local autoinfligido.

**XSS.** Sin `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function` en `src/` (grep 0). Notas se renderizan solo con `react-markdown` + `remark-gfm` **sin `rehype-raw`** (`MarkdownPreview.tsx:128`); el HTML crudo se descarta y los enlaces salen con `noopener noreferrer` (`MarkdownPreview.tsx:48–64`). Enlaces `javascript:` (p. ej. URL de recurso escrita por el usuario en `ResourceLedger.tsx:92`) quedarían bloqueados por `script-src 'self'` (sin `unsafe-inline`) — la CSP aporta defensa en profundidad ante XSS vía notas/import.

## 6. Secretos en el repo y superficie de dependencias

- `.env*`: **no existe** (glob `**/.env*` → 0). Patrones `AKIA…`, `ghp_…`, `BEGIN PRIVATE KEY` → **0**.
- Keystore Android: `android/keystore/miplan-release.jks` existe en disco pero está **ignorado y no rastreado** (`git check-ignore -v` → `.gitignore:15:*.jks`; `git ls-files -- android/keystore` → vacío). `android/keystore.properties` (credenciales de firma, referenciada en `android/app/build.gradle:26–34`) también ignorada y no rastreada (`.gitignore:16`). **No leí su contenido** (regla de no extraer secretos). ✅
- Dependencias de producción (`package.json:30–66`): sin axios/fetch-client/analítica. `undici-types` solo como tipos (dev, `@types/node`). `workbox-google-analytics` aparece como **transitivo dev** de `vite-plugin-pwa` y **no** se compila en `dist/sw.js` (0 coincidencias). Paquetes con `hasInstallScript: true` en el lockfile: **solo `esbuild` y `fsevents`** (ambos dev/opcionales; producción limpia).
- `@capacitor/*` (F-07): desviación de alcance ya **declarada** en `docs/DECISIONES.md:117–137` y con superficie reducida: `capacitor.config.ts` con `allowMixedContent: false`, `webContentsDebuggingEnabled: false`, `androidScheme: 'https'` (`capacitor.config.ts:13–20`); uso bajo `import()` dinámico con fallback navegador (`src/data/backup.ts:180–203`).
- `npm audit`: **no ejecutado** — requiere red; queda como «requiere aprobación» (F-06).

## 7. Modelo de amenaza: qué protege y qué no

| Amenaza (SECURITY.md) | ¿Protegido hoy? | Evidencia |
|---|---|---|
| Dispositivo compartido | **Parcial.** El respaldo exportado puede ir cifrado; los datos vivos en IndexedDB quedan en claro (sin gate de frase al abrir, F-02). | `SECURITY.md:5–8`, `backupCrypto.ts`, grep PassphraseGate → 0 |
| Extensión maliciosa del navegador | No mitigable desde la app; documentado correctamente. | `SECURITY.md:9–10` |
| Pérdida de disco | Mitigación: exportar JSON/`.enc`; recordatorio de último respaldo en UI. | `helpers.ts:23–32`, `BackupSection.tsx:338–342` |
| Vault Obsidian sincronizado a la nube | El archivo se genera local; **falta el aviso explícito** que afirma SECURITY.md (F-03). | `exporter.ts:98,108` |
| `.ics` con títulos personales | ✅ aviso + casilla obligatoria. | `IcsExportCard.tsx:34–38,65–90` |
| Import de JSON ajeno | ✅ 20 MB + zod + sin ejecución + preview con confirmación (respaldo); ⚠️ sin límite en banco de preguntas (F-04). | `schemas.ts:285`, `backup.ts:122`, `QuestionBankSection.tsx:218` |
| Markdown con HTML (XSS) | ✅ sin `rehype-raw` + CSP `script-src 'self'`. | `MarkdownPreview.tsx:128`, `index.html:8` |
| Dependencias/telemetría | ✅ verificado en código, build y lockfile (§2, §6). `npm audit` pendiente de aprobación. | §2 y §6 |
| Pérdida de la frase de paso | ✅ sin recuperación por diseño; aviso en UI. | `BackupSection.tsx:368–373,533–538` |

---

## 8. Hallazgos (findings)

### F-01 — MEDIO · Iteraciones PBKDF2 sin tope al descifrar archivos `.enc`
- **Impacto:** un `.enc` manipulado con `kdf.iterations` enorme (p. ej. 10¹²) provoca que `deriveKey` tarde horas/la eternidad; la app queda «ocupada» (DoS local suave; requiere que el usuario elija el archivo e introduzca una frase). No compromete confidencialidad (AES-GCM con frase incorrecta falla igual).
- **Evidencia:** `src/features/settings/backupCrypto.ts:142–144` — acepta `iterations` del archivo con solo `Number.isFinite` e `>= 1`, sin cota superior.
- **Recomendación:** limitar en `readPayload` a un rango `[1, 10_000_000]` (o ignorar el valor del archivo y usar siempre `PBKDF2_ITERATIONS` si `<=` el del archivo). Cambio de ~2 líneas en el módulo de crypto, sin cambios de formato.

### F-02 — MEDIO · La frase de paso no protege los datos vivos ni exige frase al abrir (desviación de §7.8 sin declarar)
- **Impacto:** en el escenario de amenaza «dispositivo compartido», cualquiera con acceso al perfil del navegador lee las notas y datos completos desde IndexedDB; la frase solo protege el respaldo exportado. Además, §7.8 del PRD pide frase «al abrir» y eso no está implementado ni declarado como desviación en `docs/DECISIONES.md` (aunque `SECURITY.md:5–8` lo describe con honestidad).
- **Evidencia:** grep `passphraseEnabled|PassphraseGate` en `src/` → solo `settings.ts` (UI), `BackupSection.tsx:191,362,382` (habilita export); grep `frase|passphrase` en `docs/DECISIONES.md` → 0. `SECURITY.md:5–8` lo admite.
- **Recomendación:** (a) documentar la desviación en `docs/DECISIONES.md` (ya que ahí exige el PRD §0/§11.3), y (b) si se quiere el gate de §7.8, implementarlo como bloqueo cosmético+ recordatorio de exportar; sería honesto escribir que no cifra IndexedDB (un gate real exigiría cifrar la base con la clave derivada, que es trabajo de fase posterior). **Aceptable como decisión de producto si se declara.**

### F-03 — BAJO · El vault exportado no avisa de que el contenido puede salir del dispositivo vía sync del vault
- **Impacto:** el usuario puede asumir que «100 % local» significa que el contenido nunca sale; en realidad, si su carpeta de Obsidian está sincronizada (iCloud/Dropbox/Git), el vault exportado se sube por su cuenta. SECURITY.md lo promete pero la UI no lo dice.
- **Evidencia:** `src/lib/i18n/features/exporter.ts:98,108` (solo «100 % local» y «Obsidian no fusiona carpetas»); `SECURITY.md:12–13` afirma el aviso.
- **Recomendación:** añadir una línea en `VaultSection`/`CopySection` (p. ej. junto a `exporter.vault.private`): «Si tu vault está sincronizado con la nube, estas notas también lo estarán». Texto i18n ES/EN.

### F-04 — BAJO · Import del banco de preguntas sin límite de tamaño
- **Impacto:** DoS local autoinfligido (una pestaña colgada al parsear un CSV/JSON gigante); inconsistente con el límite de 20 MB del respaldo.
- **Evidencia:** `src/features/exams/components/QuestionBankSection.tsx:218–231` — `file.text()` sin `file.size` check; parsers en `src/domain/questions.ts:137–269`.
- **Recomendación:** aplicar el mismo guard que `BackupSection.tsx:143` (p. ej. 5 MB) y truncar con mensaje.

### F-05 — BAJO · Sin tests unitarios de `backupCrypto.ts`
- **Impacto:** el módulo criptográfico más sensible del producto (round-trip, frase incorrecta, IV/sal únicos, archivo inválido) no tiene cobertura automatizada; una regresión futura podría pasar inadvertida. PRD §11.1 exige round-trip de import/export pero no nombra explícitamente el crypto.
- **Evidencia:** grep `encryptBackup|decryptBackup|PBKDF2` en `**/*.test.*` → 0 archivos.
- **Recomendación:** test de round-trip con `fake WebCrypto`/node webcrypto: cifrar→descifrar idéntico, frase mala → `wrongPhrase`, IV distintos entre dos cifrados del mismo texto, y (con F-01) iteraciones fuera de rango → `invalidFile`.

### F-06 — BAJO · Cabeceras defensivas ausentes en el servidor local (`serve.mjs`)
- **Impacto:** bajo (servidor local/LAN de un solo usuario): falta `Referrer-Policy` (y podría añadirse `X-Frame-Options`/`Cross-Origin-Opener-Policy`); la CSP via meta no puede llevar `frame-ancestors`.
- **Evidencia:** `scripts/serve.mjs:81–89` solo envía `Content-Type`, `Cache-Control`, `Service-Worker-Allowed`, `X-Content-Type-Options`. `index.html` no tiene `<meta name="referrer">`.
- **Recomendación:** añadir `Referrer-Policy: no-referrer` en `serve.mjs` (y meta `referrer` en `index.html` para el caso `file://`). Nota: desplegar detrás de cualquier CDN/servidor futuro deberá replicar estas cabeceras.

### F-07 — BAJO · `npm audit` no ejecutado (requiere red)
- **Impacto:** no se pudo verificar el estado de CVEs de dependencias en esta revisión (jszip, dexie, react-markdown/micromark, vite, etc.). El análisis de superficie estático no halló telemetría ni clientes HTTP en producción (§6), y los dos paquetes con scripts de instalación son dev/opcionales (`esbuild`, `fsevents`).
- **Evidencia:** lockfile v3 presente; ejecución de `npm audit` **no realizada** por requerir acceso a red (según contrato, queda «requiere aprobación»).
- **Recomendación:** ejecutar `npm audit --package-lock-only` (o `npm audit`) con aprobación humana antes de cada release; fijar el resultado en `docs/RELEASE.md`.

### F-08 — INFORMATIVO · `fetch` muerto de Dexie compilado en los bundles
- Los bundles de la app contienen helpers `fetch(e.url, …)` del propio paquete `dexie` (módulo cloud/sync no usado: `src/data/db.ts` no configura nube; `dexie-cloud` no está en `package.json`). La CSP `connect-src 'self'` bloquea cualquier red externa aunque ese código se invocara. Sin acción requerida; considerar reportarlo upstream para tree-shaking si preocupa el tamaño.

### F-09 — INFORMATIVO · `style-src 'unsafe-inline'` (requerido por el PRD §10)
- Es el valor que pide el propio PRD; permite inyección de estilo (no de script). Riesgo residual aceptado para una app local-first sin usuarios remotos.

### F-10 — INFORMATIVO · Datos de negocio sin cifrar en reposo (decisión aceptada y documentada)
- IndexedDB del perfil del navegador en claro; es limitación de la plataforma, documentada en `SECURITY.md:5–8`. `localStorage` sin secretos (§5). Aceptable para uso personal con recomendación de exportar periódicamente.

### F-11 — INFORMATIVO · Controles verificados sin hallazgos (positivos)
CSP estricta preservada en build · cero `fetch`/XHR/WS/Beacon en `src/` y en bundles de app · cero `innerHTML`/`eval` · Markdown sin `rehype-raw` + enlaces `noopener` · import respaldo 20 MB + zod + preview + modo explícito · «Borrar todo» con doble confirmación y palabra `BORRAR` · ICS con casilla de confirmación · crypto con sal/IV aleatorios por operación, clave no extraíble, frase no persistida · sin `.env`/claves en el repo, keystore y `keystore.properties` fuera de git · desviación Capacitor declarada en `DECISIONES.md:117–137` con `webContentsDebuggingEnabled: false` · `theme-init.js` externo y defensivo · HashRouter compatible con `file://`.

---

## 9. Alcance

### Cubierto (scope_covered)
1. Cero red: `src/`, `dist/` (bundles + `sw.js`), `index.html`, CSS, lockfile (búsquedas listadas en §2).
2. CSP/cabeceras/SW: `index.html`, `dist/index.html`, `vite.config.ts`, `scripts/serve.mjs`.
3. Criptografía: `backupCrypto.ts` completo + flujo en `BackupSection.tsx` + ausencia de tests.
4. Persistencia/fugas/export/import: `db.ts`, `schemas.ts`, `backup.ts`, `DangerSection.tsx`, `IcsExportCard.tsx`, `obsidian.ts` (sanitizado), uso de `localStorage`.
5. XSS: greps de sinks peligrosos, `MarkdownPreview.tsx`, interacción con CSP.
6. Secretos en repo: glob `.env*`, patrones de claves, keystore/properties vía git (sin leer credenciales).
7. Dependencias/superficie: `package.json`, lockfile (install scripts, paquetes de red), `@capacitor/*` y `capacitor.config.ts`, build del SW.
8. Modelo de amenaza: contrastado punto a punto con `SECURITY.md` (§7).

### No cubierto (not_covered) y por qué
- **`npm audit` / CVEs conocidos:** requiere red → no ejecutado sin aprobación (F-07).
- **Pruebas dinámicas** (ejecutar la app, probar el SW en vivo, intentos de XSS reales en navegador): este entorno exige confirmación para comandos interactivos/servidores; la revisión es **estática** con evidencia de build ya compilado.
- **Código fuente de `android/` (Java/Kotlin) y del APK:** solo se revisó configuración de firma y Capacitor; compilar/inspeccionar el APK está fuera de alcance.
- **Contenido del keystore y `keystore.properties`:** no leídos por política de no extraer secretos; se verificó únicamente que estén fuera de git.
- **Comportamiento en Safari/Firefox y en el APK instalado:** no ejecutado (requiere entorno físico/emulador).
- **Auditoría de dependencias transitivas más allá del lockfile** (p. ej. scripts postinstall efectivos): verificados solo los flags `hasInstallScript` y la ausencia de clientes HTTP en producción.

## 10. Veredicto

**¿Bloqueante? NO.** Es seguro entregar este MVP como app **local-first de uso personal**. Los controles de §10 están implementados y verificables; no hay hallazgos críticos ni altos; los dos medios son: (1) una desviación de §7.8 que debe **declararse** (o implementarse el gate, sabiendo que no cifra la base) y (2) un tope de iteraciones faltante de dos líneas. El resto son mejoras recomendadas o riesgos residuales aceptados y documentados.

## 11. Siguiente paso recomendado

1. Aplicar F-01 (tope de iteraciones) y F-02a (declarar la desviación de la frase en `docs/DECISIONES.md`) — cambios mínimos, alto valor de veracidad.
2. Añadir los tests de F-05 junto con el cambio de F-01.
3. Con aprobación humana: ejecutar `npm audit` (F-07) antes de la próxima release y fijar el resultado.
4. Textos de aviso de F-03 y guard de tamaño de F-04 en la siguiente pasada de UX.

## 12. Resultado del contrato

```
task_id: SEC-001
status: completed
summary: Revisión estática completa vs §10: cero red verificado (código, build y SW), CSP estricta presente y sobreviviente al build, crypto correcta (PBKDF2 310k + AES-GCM 256, sal/IV aleatorios), import validado con límite y confirmación, sin secretos en repo. 0 críticos, 0 altos, 2 medios (passphrase sin gate al abrir — desviación §7.8 no declarada; iteraciones PBKDF2 sin tope al descifrar), 5 bajos, 3 informativos.
findings: F-01 medio (backupCrypto.ts:142-144 iteraciones sin tope) · F-02 medio (passphrase no protege datos vivos/gate ausente; DECISIONES.md sin declarar) · F-03 bajo (vault sin aviso de sync a nube) · F-04 bajo (import preguntas sin límite de tamaño) · F-05 bajo (sin tests de backupCrypto) · F-06 bajo (cabeceras Referrer-Policy ausentes en serve.mjs) · F-07 bajo (npm audit pendiente, requiere red/aprobación) · F-08..F-11 informativos
scope_covered: cero red; CSP/cabeceras/SW; criptografía; persistencia/fugas/import/export; XSS; secretos en repo; dependencias/@capacitor; modelo de amenaza contrastado con SECURITY.md
not_covered: npm audit (red → aprobación); pruebas dinámicas/pen-test en navegador; código APK/android más allá de config; contenido de keystore (no leído por política); Safari/Firefox/APK en dispositivo
verdict: sin bloqueantes — seguro para entrega como MVP local-first personal, con las salvedades F-01..F-07
recommended_next_step: aplicar F-01 + F-02a (declarar desviación) + tests F-05; npm audit con aprobación antes de release
approval_required: true (solo para npm audit / comandos con red)
```

**Archivo generado:** `docs/SEGURIDAD-REVISION.md` (único archivo escrito por esta tarea; no se modificó código de producto).
