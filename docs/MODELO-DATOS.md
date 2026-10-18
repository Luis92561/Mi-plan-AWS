# Modelo de datos

Base Dexie `miplan-aws` (IndexedDB). Campos en `camelCase`. Fechas ISO-8601 UTC,
salvo `date` (`YYYY-MM-DD` local de `America/Bogota`) y `hoursDone`/`hoursPlanned`
en horas. Duraciones en minutos. Dinero en USD.

Los tipos exactos viven en [`src/data/types.ts`](../src/data/types.ts) y el esquema
(zod) en [`src/data/schemas.ts`](../src/data/schemas.ts). Las versiones de Dexie y la
migración están en [`src/data/db.ts`](../src/data/db.ts).

## 1. Tablas

| # | Tabla | Clave | Índices | Qué guarda |
|---|---|---|---|---|
| 1 | `certifications` | `id` (código) | `code`, `phase`, `level`, `lifecycle` | Catálogo del Anexo A, editable. Dominios con peso 0..1 (suma 1), prerrequisitos, ciclo de vida |
| 2 | `planItems` | `id` | `certId`, `order`, `status` | Mi ruta personal: una fila por certificación decidida. `hoursDone` es derivado de sesiones |
| 3 | `resources` | `id` | `certId`, `type`, `status`, `[certId+type]` | Cursos, labs, workshops, badges, sets de práctica. `certId: null` = fase 0 (gratis) |
| 4 | `studySessions` | `id` | `date`, `certId`, `type`, `[certId+date]` | Bitácora: minutos, tipo, confianza 1–5, dominio |
| 5 | `attempts` | `id` | `certId`, `date`, `kind`, `[certId+date]` | Simulacros y examen real, con `breakdown` por dominio |
| 6 | `flashcards` | `id` | `certId`, `dueDate`, `domainId` | Repaso SM-2: `ease`, `intervalDays`, `reps`, `lapses` |
| 7 | `vouchers` | `id` | `status`, `expiresAt` | Descuentos del 50 % (aprobación, campaña, beta, manual) |
| 8 | `budgetItems` | `id` | `status`, `certId`, `kind` | Costos planeados y pagados |
| 9 | `topics` | `id` | `certId`, `status`, `nextReviewAt`, `priority`, `[certId+status]` | Unidad atómica de estudio con su propia agenda (§8.7) |
| 10 | `checklistItems` | `id` | `certId`, `topicId`, `done`, `groupId`, `dueDate`, `templateKey`, `[certId+done]`, `order` | Plantillas por nivel, ítems propios, recurrentes, archivables |
| 11 | `notes` | `id` | `certId`, `domainId`, `topicId`, `pinned`, `*tags` | Markdown con metadatos y etiquetas (multiEntry) |
| 12 | `reminders` | `id` | `dueAt`, `status`, `type`, `refId` | Recordatorios generados y manuales |
| 13 | `exportProfiles` | `id` | `name` | Cómo se arma el vault de Obsidian |
| 14 | `questions` | `id` | `certId`, `domainId`, `archived`, `[certId+domainId]` | Banco de preguntas **propio** (F3.2): enunciado, 2–6 opciones, índice correcto, explicación y fuente |
| 15 | `settings` | `id = 'app'` | — | Registro único de ajustes y preferencias reflejadas |

## 2. Relaciones

```
certifications 1─┬─< planItems        (certId)
                 ├─< resources        (certId, null = fase 0)
                 ├─< studySessions    (certId)
                 ├─< attempts         (certId, breakdown[].domainId)
                 ├─< flashcards       (certId, domainId opcional)
                 ├─< topics           (certId, domainId opcional)
                 ├─< checklistItems   (certId, topicId opcional)
                 └─< notes            (certId / domainId / topicId opcionales)

topics       1──< checklistItems   (topicId)  · 1──< reminders (type 'tema', refId)
attempts     1──1 vouchers         (voucherId en attempts y budgetItems)
questions    ──  certificación + dominio (el simulacro reparte por peso de dominio)
notas        ──  sin relaciones duras (certId/domainId/topicId son punteros blandos)
```

Los punteros blandos (`certId` en notas y recursos, `topicId` en checklist) no usan
claves foráneas de Dexie: si una certificación desaparece del catálogo, sus datos no se
pierden ni quedan huérfanos rotos; el export degrada el enlace a texto plano.

## 3. Campos derivados (no se guardan o se recalculan)

| Valor | Origen |
|---|---|
| `planItems.hoursDone` | `Σ studySessions.minutes / 60` de esa certificación (`withHoursDone`) |
| Readiness | `computeReadiness` a partir de intentos, recursos, sesiones y plan (§8.1) |
| Puntaje estimado | `100 + 900 × (correctas / total)` (`estimatedScore`) |
| `passed` | puntaje reportado ≥ mínimo, o estimado ≥ mínimo (`normalizeAttempt`) |
| `topic.nextReviewAt` | `scheduleTopic` según confianza y `reviewCount` (§8.7) |
| Progreso del checklist | hechos / (hechos + pendientes), excluye `archived` (§8.9) |
| Racha y horas semanales | `streakDays` / `weekMinutes` sobre sesiones, corte lunes–domingo |
| Alertas | `buildAlerts` (máximo 3, por prioridad, §8.5) |

## 4. Migraciones

- **v1**: esquema completo + tabla heredada `tasks` (versiones previas de la app).
- **v2**: elimina `tasks` y convierte cada tarea en un `checklistItem` del grupo
  `personal` (`convertLegacyTasks`), añade el índice `order` al checklist.
- **v3** (F3.2): añade `questions` (banco de preguntas propio). No modifica datos
  existentes; un respaldo antiguo se importa sin `questions` y queda como lista vacía
  (`questionSchema.optional().default([])`).

Reglas: nunca se borran datos del usuario al migrar; la conversión es idempotente y
está cubierta por `src/data/__tests__/migrations.test.ts` (con `fake-indexeddb`).

## 5. Respaldo

`buildBackupText(state)` produce:

```json
{ "app": "miplan-aws", "schemaVersion": 2, "exportedAt": "…", "data": { …13 tablas…, "settings": {…} } }
```

`parseBackupText` valida tamaño (20 MB), JSON y esquema zod antes de tocar la base.
`importBackup(data, mode)` acepta `replace` (deja exactamente el archivo) o `merge`
(fusiona por `id`; gana el archivo).
