# Contrato de desarrollo — Mi Plan AWS

Documento de obligado cumplimiento para cualquier persona o agente que escriba código en este repositorio.
La especificación funcional completa vive en
`C:\Users\luis9\Documents\universidad\prompts\prompt-app-plan-aws.md` (secciones citadas como §n).

## 1. Reglas no negociables

1. **Cero colores en componentes.** `#rrggbb` fuera de `src/styles/tokens.css` es un error. Usa las clases
   Tailwind mapeadas: `bg-bg`, `bg-panel`, `bg-panel-2`, `bg-hover`, `bg-active`, `text-text`, `text-muted`,
   `text-accent`, `text-ok`, `text-warn`, `text-err`, `border-line`, `border-control`, `border-accent`, …
2. **Cero texto literal visible en JSX.** Todo pasa por `t('clave')`. Excepciones: `aria-hidden` decorativo
   (`❯`, `─`, glifos `● ◐ ○ ▲ ✓ ›`), códigos de certificación (`SAA-C03`), y los datos que escribe el usuario.
3. **Cero `fetch`.** Nada de red en runtime. Los enlaces externos son `<a target="_blank" rel="noopener">`.
4. **Cero librerías nuevas.** Dependencias disponibles: `react`, `react-router-dom`, `dexie`,
   `dexie-react-hooks`, `react-hook-form`, `zod`, `recharts`, `date-fns`, `react-markdown`, `remark-gfm`,
   `jszip`, `lucide-react`, `clsx`, `tailwind-merge`, `@radix-ui/*`.
5. **TypeScript strict, sin `any`, sin `console.log`.** Sin `// @ts-ignore` ni `eslint-disable` nuevos.
6. **No edites** `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `tailwind.config.ts`,
   `index.html`, `src/styles/*`, `src/lib/i18n/{es,en,shape,translate,useT,define}.ts`, `src/app/*`,
   `src/components/ui/*`, `src/components/PagePlaceholder.tsx`, `src/data/{types,db,schemas}.ts`,
   ni módulos de `src/domain/*` que no sean tuyos.
7. **No dupliques layout por idioma.** Un solo árbol de componentes; el texto viene del diccionario.
8. **Accesibilidad (§9.8):** foco visible, `aria-label` en iconos, `main`/`nav`/`aside` con nombre,
   tablas con `<th scope>`, nada depende solo del color (glifo + texto), targets ≥44 px en móvil,
   `aria-live="polite"` para estados cambiantes.
9. **Mobile-first:** verifica 360 px (sin desbordes horizontales ni botones cortados) y 768/1280 px.
   El español es 15–20 % más largo que el inglés: cero anchos fijos en botones y chips.

## 2. Datos

Leer: `useAppState()` de `@/data/store` → `{ state, ready }` con el `AppState` completo (reactivo a IndexedDB).
Escribir: `getDb()` de `@/data/db` (instancia Dexie). Tablas: `certifications`, `planItems`, `resources`,
`studySessions`, `attempts`, `flashcards`, `vouchers`, `budgetItems`, `topics`, `checklistItems`, `notes`,
`reminders`, `exportProfiles`, `settings`.

```ts
import { getDb } from '@/data/db';
import { newId } from '@/data/store';
await getDb().notes.put({ ...note });
await getDb().checklistItems.update(id, { done: true });
await getDb().studySessions.delete(id);
```

Utilidades: `newId(prefix)`, `nowIso()`, `certById(state, certId)`, `domainById(state, certId, domainId)`,
`saveSettings(settings)`, `clearAllData()`, `useSettings()`.

## 3. Lógica de dominio (pura, ya implementada — úsala, no la reimplementes)

- `@/domain/readiness` — `computeReadiness({cert, planItem, attempts, resources, sessions})` → `{score, preliminary, breakdown, accuracyByDomain, attemptsCount}`, `passingRatio`.
- `@/domain/scoring` — `estimatedScore(correct, total)`, `attemptScore`, `attemptPassed`, `normalizeAttempt`, `averageOfLast`, `domainProgress`.
- `@/domain/recommend` — `nextRecommended({planItems, certifications, now})`, `unlockState`, `blockingPrerequisites`, `sortRoute`, `groupByPhase`, `retiringSoon`, `daysToRetirement`, `unlockedPending`.
- `@/domain/budget` — `remainingRouteCost`, `budgetTotals`, `cumulativeSpend`, `vouchersExpiringSoon`, `expireVouchers`, `voucherFromApproval`.
- `@/domain/stats` — `weekMinutes`, `weeklyTotals`, `streakDays`, `heatmap`, `lastSessionDate`, `inactiveDays`, `hoursForCert`, `withHoursDone`, `weeklyGoalRatio`.
- `@/domain/sm2` — `sm2(card, grade, now)`, `dueCards`, `newFlashcard`, `LADDER`.
- `@/domain/checklist` — `checklistProgress`, `completeItem(item, all, now)`, `pendingForToday`, `groupChecklist`, `nextDueDate`.
- `@/domain/today` — `buildTodayQueue(state, now)`.
- `@/domain/alerts` — `buildAlerts(state, now)`, `daysToExam`.
- `@/domain/schedule` — `scheduleTopic(topic, confidence, now)`, `snoozeTopic(topic, days, now)`.
- `@/domain/reminders` — `buildReminders(input)`.
- `@/domain/ics` — `buildIcs({state, now, horizonDays, sequence})`, `icsFilename(now)`, `buildUid`, `foldLine`, `escapeText`.
- `@/domain/obsidian` — `buildVault({state, profile, locale, now})` → `{path, content}[]`, `renderCertNote`, `renderRouteNote`, `renderChecklistNote`, `renderCalendarNote`, `sanitizeFilename`, `certFolderName`.
- `@/domain/markdown` — `renderWeeklySummary`, `renderFullReport`, `renderBudgetReport`.

## 4. Fechas, formatos e idioma

- `@/lib/dates`: `localDate(now)`, `localIso`, `addDaysToDate`, `dateTimeInTz`, `daysBetween`,
  `startOfWeekMonday`, `weekdayOf`, `TZ`. **Zona fija `America/Bogota`.**
- `useT()` de `@/lib/i18n/useT` → `{ t, f, locale, setLocale }`.
  `f.date('2026-10-18')` → `18 oct 2026` / `Oct 18, 2026`; `f.currency(150)` → `150 US$` / `$150`;
  `f.hours(90)` → `1,5 h` / `1.5h`; `f.percent(0.62)` → `62 %` / `62%`; `f.score(737, 720)` → `737/720`.
  **Nunca** uses `toLocaleString()` directo ni `n === 1 ? … : …` para plurales.
- Plurales: claves `clave_one` / `clave_other` + `t('clave', {count: n})`.
- Lo que **no** se traduce: nombres oficiales de certificaciones, dominios, servicios AWS, códigos y los
  valores canónicos de los enums (`aprobado`, `associate`). Los labels de enum ya existen:
  `enum.plan.<status>`, `enum.level.*`, `enum.resource.<type>`, `enum.resourceStatus.*`, `enum.study.*`,
  `enum.attempt.*`, `enum.topic.*`, `enum.group.*`, `enum.recurrence.*`, `enum.budgetKind.*`,
  `enum.budgetStatus.*`, `enum.voucherStatus.*`, `enum.voucherSource.*`, `enum.reminder.*`,
  `enum.reminderStatus.*`, `enum.priority.*`, `enum.lifecycle.*`, `enum.phase.*`, `enum.phaseShort.*`.

## 5. Diccionarios por feature

Cada feature tiene **un archivo propio**: `src/lib/i18n/features/<ns>.ts`.

```ts
import { defineNamespace } from '../define';

export const today = defineNamespace({
  ns: 'today',
  es: { 'today.title': 'Hoy', /* … */ },
  en: { 'today.title': 'Today', /* … */ },
});
```

- El tipo obliga a tener en `en` exactamente las claves de `es`: si falta una, no compila.
- Mantén la clave `'<ns>.title'` que ya existe.
- No escribas en archivos de otros namespaces.
- Claves vacías prohibidas. Las mismas variables `{x}` en ambos idiomas.

## 6. Componentes compartidos (no los modifiques: úsalos)

- `@/components/ui/primitives`: `Button` (`variant`: primary|secondary|ghost|danger, `size`: sm|md|lg, `glyph`),
  `Card`, `CardHead`, `CardBody`, `Field` (label/hint/error), `Input`, `Textarea`, `Select`, `Chip`,
  `Badge` (`tone`: neutral|ok|warn|err|accent), `SectionHead` ({no, title, action, hint}), `EmptyState`,
  `Skeleton`, `Progress`, `StatusGlyph` ({state, label}), `DottedRule`, `SectionNumber`.
- `@/components/ui/modal`: `Modal` ({open, onOpenChange, title, description, children, footer, className, closeLabel}).
- `@/components/ui/menu`: `Menu`, `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuSeparator`, `MenuLabel`.
- `@/components/ui/tabs`: `TabsRoot`, `TabsList` ({ariaLabel}), `TabsTrigger`, `TabsContent`.
- `@/components/ui/toast`: `useToast()` → `notify(text, 'ok'|'err'|'neutral')`.
- `@/components/ui/ring`: `ReadinessRing` ({value, label, caption, preliminary, tone}).
- `@/components/ui/toggle`: `Checkbox`, `Switch`.
- `@/features/studylog/QuickSession`: `useQuickSession().openQuickSession({certId})`, `saveStudySession(draft)`.
- `@/app/prefs`: `usePrefs()` → `{ prefs, setTheme, setLocale, setFontMode, setFontScale }`.

Si necesitas un componente nuevo, créalo **dentro de tu feature** (`src/features/<tuya>/components/`).

## 7. Estilo visual (resumen operativo de §9)

- Estética "terminal editorial": monoespaciada, reglas de 1 px, cifras tabulares (`tnum`), numerales `§ 01`.
- Radios: tarjetas 10 px (`rounded-card`), inputs 6 px (`rounded-input`), chips 999 px (`rounded-chip`).
- Sombras solo en overlays. En reposo, borde.
- El naranja de acento (`text-accent`, `bg-accent`) ocupa **≤10 %** de la pantalla: acción primaria, foco,
  cifra clave y subrayado de sección. Todo lo demás en grises (`muted`, `line`).
- Tamaños de texto: `text-label`, `text-meta`, `text-ui`, `text-body`, `text-read`, `text-h3`, `text-h2`,
  `text-display`. Labels en mayúsculas con `label-mono`.
- Glifos de estado siempre con texto: `●` aprobado · `◐` en curso · `○` pendiente · `▲` alerta · `✓` hecho · `›` bloqueado.
- Puntajes `737/720`, fechas `2026-10-18` o `f.date()`.
- Empty states con CTA; skeletons mientras `ready === false`; toasts 4 s abajo a la derecha.

## 8. Verificación antes de entregar

```powershell
npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String "src/features/<tuya>|src/lib/i18n/features/<ns>"
npx eslint src/features/<tuya> src/lib/i18n/features/<ns>.ts
```

- Errores de TypeScript en **tus** archivos: cero.
- Errores en archivos de otras personas: ignóralos (otro agente los está escribiendo), no los arregles.
- Reporta la salida real de los comandos. Nunca afirmes que algo pasa sin pegarla.
