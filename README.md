# Mi Plan AWS

Panel **privado y local-first** para planificar, registrar y medir el avance en las
certificaciones de AWS: de la preparación gratuita (badges, labs, sets de 20 preguntas)
hasta el examen pagado, con readiness, simulacros, presupuesto con vouchers, repaso,
recordatorios sin nube y export a Obsidian.

- **Sin cuentas, sin backend, sin telemetría.** Todo vive en IndexedDB de tu navegador.
- **Bilingüe ES/EN** con conmutador en la cabecera y formatos regionales (`Intl`).
- **Tema claro / oscuro / sistema** sin destello al recargar.
- **Funciona sin conexión** después de la primera carga (PWA).
- **Banco de preguntas propio** (F3.2): importa CSV/JSON con tus preguntas y ejecuta
  simulacros repartidos por los pesos de dominio del examen. Sin dumps, nunca.

## Requisitos

- Node.js 20+ (probado con 24) y npm 10+.
- Navegador moderno con IndexedDB y WebCrypto (Chrome, Edge, Firefox, Safari 16+).

## Instalación y comandos

```bash
npm install          # dependencias
npm run dev          # entorno de desarrollo (http://localhost:5173)
npm run build        # build de producción en dist/ (tsc -b + vite build)
npm run preview      # sirve el build (necesario para probar la PWA/offline)
npm run verify       # lint + tipos + 296 tests + build (lo mismo que el CI)
npm run verify:all   # lo anterior + end-to-end
npm test             # tests unitarios y de integración (vitest)
npm run test:e2e     # 16 escenarios end-to-end (Playwright)
npm run test:pwa     # offline real con service worker (requiere `vite preview`)
npm run lint         # ESLint (flat config)
npm run shots        # regenera las capturas de docs/shots y mockups/
npm run vault:demo   # regenera examples/vault-demo desde los datos de ejemplo
```

El repositorio incluye CI en [`.github/workflows/ci.yml`](.github/workflows/ci.yml) con tres
jobs (verificación, end-to-end y offline con service worker) y la guía de publicación en
[`docs/RELEASE.md`](docs/RELEASE.md).

> El build necesita un directorio temporal escribible. Si `vite build` falla con
> `Access is denied` sobre `%TEMP%`, ejecuta con `TEMP`/`TMP` apuntando al proyecto:
> `TEMP=.tmp TMP=.tmp npm run build` (en PowerShell: `$env:TEMP=".tmp"; $env:TMP=".tmp"`).

## Usarla en tus dispositivos

| Dónde | Cómo | Icono de app | Offline |
|---|---|:--:|:--:|
| Windows | doble clic en `start-windows.cmd` | ✅ | ✅ |
| Mac Intel | doble clic en `start-mac.command` | ✅ | ✅ |
| iPhone (misma Wi-Fi) | `npm run serve:lan` y abrir la IP que imprime | ✅ | ✅ solo con `--https` + certificado propio |
| **Android / Huawei** | **APK propio**: `deliverables/miplan-aws-1.2.0.apk` (`npm run apk`) | ✅ nativo | ✅ desde el primer arranque |

Sin cuentas y sin pagar nada. Los pasos completos (incluido cómo mover los datos entre
dispositivos con el respaldo JSON y qué no es posible gratis) están en
[`docs/DISPOSITIVOS.md`](docs/DISPOSITIVOS.md).

## Primeros pasos

1. Abre la app. El catálogo de **13 certificaciones** se siembra solo (Anexo A).
2. Pulsa **«Cargar ruta recomendada»**: crea tus 12 certificaciones planificadas,
   los recursos gratuitos de la fase 0, las plantillas de checklist por nivel y los
   temas base por dominio. AIB-C01 queda en el catálogo para añadirla cuando quieras.
3. Si solo quieres explorar, usa **«Cargar datos de ejemplo»** (Ajustes → Respaldo).

## Cómo hacer respaldo

**Ajustes → Respaldo**

- **Exportar JSON** descarga `miplan-aws-YYYY-MM-DD.json` con `schemaVersion`. Es la
  red de seguridad: incluye todo (sesiones, intentos, notas, checklist, temas, presupuesto).
- **Importar JSON** valida el archivo con zod (límite 20 MB) y permite *reemplazar* o
  *fusionar por id*.
- **Exportar respaldo cifrado** (opcional, con frase de paso): PBKDF2-SHA256 310 000
  iteraciones + AES-GCM 256 con sal de 16 bytes. **Si pierdes la frase, pierdes el
  respaldo**: no hay recuperación.
- **Borrar todo** exige doble confirmación escribiendo `BORRAR`.

## Cómo actualizar el dataset de certificaciones

El dataset vive en `src/data/seed.ts` (`CERTIFICATIONS`, `RECOMMENDED_ROUTE`,
`CHECKLIST_TEMPLATES`, `PHASE0_RESOURCES`, `buildCertResources`). Detalle completo en
[`docs/CONTENIDO.md`](docs/CONTENIDO.md). Resumen:

1. Contrasta precios, códigos, duración, dominios y pesos en las guías oficiales
   (<https://docs.aws.amazon.com/aws-certification/latest/examguides/aws-certification-exam-guides.html>).
2. Edita el registro correspondiente y actualiza `verifiedOn`.
3. Marca transiciones con `lifecycle` (`retiring`/`retired`) y `retirementDate`.
4. Si no puedes verificar un dato, déjalo con la etiqueta `verificar` en `notes`
   (nunca lo inventes).

## Cómo exportar a Obsidian

**Exportar** (menú lateral) ofrece:

| Acción | Resultado |
|---|---|
| Copiar para Obsidian | Frontmatter + resumen + dominios + checklist + intentos de una certificación, con wikilinks |
| Copiar ruta | `_Ruta AWS.md` con la tabla de estado de toda la ruta |
| Copiar resumen semanal | Horas, sesiones, temas dominados y próximos hitos |
| Exportar vault (.zip) | Árbol completo según el Anexo C de la especificación |

1. Elige el perfil de exportación (qué incluir) y revisa el **preview del árbol**.
2. Descarga `miplan-aws-vault-YYYY-MM-DD.zip`.
3. Descomprime dentro de tu vault, en la carpeta `AWS/` (créala si no existe).
4. Si ya tenías una exportación anterior, renombra la carpeta vieja a `AWS_old/`
   antes de descomprimir: **Obsidian no fusiona carpetas**.
5. Abre `_Ruta AWS.md` y verifica que los wikilinks estén en azul (no roscos).

Hay un vault ya exportado en [`examples/vault-demo/`](examples/vault-demo) para que lo
abras sin generar nada. Las plantillas que produce están documentadas en
[`docs/PLANTILLAS-OBSIDIAN.md`](docs/PLANTILLAS-OBSIDIAN.md).

## Cómo importar el calendario

**Recordatorios → Exportar .ics** genera `miplan-aws-calendario-YYYY-MM-DD.ics` con los
próximos 90 días: bloques de repaso de 30 min, exámenes agendados (todo el día) y
revisiones de flashcards, con `VALARM` 15 minutos antes y `TZID:America/Bogota`.

1. Confirma el aviso (el archivo contiene títulos de temas: información personal).
2. Importa el `.ics` en Google Calendar, Apple Calendario u Outlook **una sola vez**.
3. Cada reexportación sube `SEQUENCE`, así el calendario actualiza los eventos.
4. El `.ics` es una **foto** del plan: si cambias el plan, reexporta e importa.

## Banco de preguntas y simulacros (F3.2)

**Práctica → Banco de preguntas**: importa un CSV o JSON con tus preguntas (o descarga la
plantilla), revisa el preview con los errores por línea y lanza un simulacro. El reparto
respeta los pesos de dominio del examen: con 20 preguntas de SAA-C03 y pesos 30/26/24/20,
el simulacro pide 6/5/5/4.

- Formato y ejemplo: [`examples/preguntas-ejemplo.csv`](examples/preguntas-ejemplo.csv) y
  [`docs/CONTENIDO.md`](docs/CONTENIDO.md#5-banco-de-preguntas-propio-f32).
- El resultado se guarda como un intento normal: puntaje estimado, comparación con el
  mínimo, desglose por dominio y revisión pregunta a pregunta con la explicación.
- Reimportar el mismo archivo no duplica preguntas (se compara certificación + enunciado).

## Estructura del proyecto

```
src/
  app/            # rutas, layout, cabecera, paleta de comandos, preferencias, boot
  features/       # dashboard, today, roadmap, certification, studylog, exams,
                  # resources, budget, flashcards, checklist, notes, reminders,
                  # export, settings
  domain/         # lógica pura: readiness, scoring, recommend, budget, stats,
                  # schedule, reminders, sm2, checklist, alerts, today, ics,
                  # obsidian, markdown
  data/           # Dexie (db), tipos, esquemas zod, seed, respaldo, store
  components/ui/  # primitivas (botón, tarjeta, inputs, modal, menú, tabs, toast…)
  lib/            # i18n, fechas (America/Bogota), formatos Intl, portapapeles, cn
  styles/         # tokens.css (única fuente de color) + index.css
docs/             # DECISIONES, MODELO-DATOS, CONTENIDO, PLANTILLAS-OBSIDIAN,
                  # SECURITY, CONTRATO-DESARROLLO y docs/shots
examples/         # vault-demo ya exportado
mockups/          # referencia visual (capturas reales) + mockup.css
tests/            # setup, unit (heuristics), demo (generador del vault), e2e
```

Regla de dependencias: `features → domain`, `features → data`; **nunca**
`domain → React | Dexie`. Toda la lógica de negocio se prueba sin DOM.

## Verificación

```bash
npm run lint    # 0 errores, 0 warnings
npm test        # 296 tests (28 archivos)
npm run build   # tsc -b + vite build sin errores
npm run test:e2e  # 16 pruebas end-to-end en Chromium (escenarios §11.2 + exportaciones + capturas)
npm run test:pwa  # opcional: offline real contra `vite preview` (ver abajo)
```

Para la prueba offline de la PWA (el service worker no existe en `vite dev`):

```bash
npm run build
npx vite preview --port 5184 --strictPort
# PowerShell: $env:PWA_URL="http://127.0.0.1:5184"
npm run test:pwa
```

Atajos: `Ctrl/Cmd+K` paleta de comandos · `?` hoja de atajos · `Alt+T` tema · `Alt+L` idioma.

El estado de cada criterio de la §11.3 está en
[`docs/DECISIONES.md`](docs/DECISIONES.md) y la medición de Lighthouse (91 / 100 / 100)
en [`docs/LIGHTHOUSE.md`](docs/LIGHTHOUSE.md).
