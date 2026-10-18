import type { AppState, Reminder, ReminderStatus } from '@/data/types';
import { REMINDER_WINDOW_DAYS, buildReminders } from '@/domain/reminders';
import { localDate, localTime } from '@/lib/dates';

/* =============================================================================
   Modelo de la bandeja de Recordatorios (§7.13, §8.8).
   Puro: recibe `state` y `now`, no escribe nada.
   ========================================================================== */

/** Días que cubre el calendario exportado (§7.13). */
export const ICS_HORIZON_DAYS = 90;

/** Estados que la bandeja muestra: pendiente, enviado y pospuesto (§7.13). */
const VISIBLE_STATUSES: ReadonlySet<ReminderStatus> = new Set<ReminderStatus>([
  'pendiente',
  'enviado',
  'pospuesto',
]);

export interface ReminderView {
  reminder: Reminder;
  /** Lo propone `buildReminders` para la ventana actual. */
  generated: boolean;
  /** Hay una fila guardada en `reminders` con este id (estado o posposición). */
  persisted: boolean;
}

/**
 * Une los recordatorios generados por el plan (`buildReminders`, puro y
 * determinista) con los guardados en IndexedDB.
 *
 * Regla de fusión: el contenido (título, fecha, canal) viene del generador —es
 * el que refleja el plan de hoy— y el estado viene de la fila guardada, para
 * que lo que la persona marcó como hecho/pospuesto/descartado se respete.
 */
export function buildReminderViews(state: AppState, now: Date): ReminderView[] {
  const generated = buildReminders({
    now,
    settings: state.settings,
    topics: state.topics,
    certifications: state.certifications,
    planItems: state.planItems,
    checklistItems: state.checklistItems,
    vouchers: state.vouchers,
    attempts: state.attempts,
    studySessions: state.studySessions,
  });

  const storedById = new Map(state.reminders.map((reminder) => [reminder.id, reminder] as const));
  const views = new Map<string, ReminderView>();

  for (const reminder of generated) {
    const stored = storedById.get(reminder.id);
    views.set(reminder.id, {
      reminder: stored
        ? { ...reminder, status: stored.status, snoozedUntil: stored.snoozedUntil, createdAt: stored.createdAt }
        : reminder,
      generated: true,
      persisted: stored !== undefined,
    });
  }

  // Filas guardadas que el generador ya no produce (un `custom`, o un aviso de
  // otra ventana) siguen visibles si la persona no las cerró.
  for (const stored of state.reminders) {
    if (views.has(stored.id)) continue;
    views.set(stored.id, { reminder: stored, generated: false, persisted: true });
  }

  return [...views.values()].filter((view) => VISIBLE_STATUSES.has(view.reminder.status));
}

export interface ReminderGroups {
  pending: ReminderView[];
  sent: ReminderView[];
  snoozed: ReminderView[];
}

/** Instante de orden; lo no parseable se va al final en vez de romper el sort. */
function timeValue(iso: string | null): number {
  if (iso === null) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

/** Agrupa por estado: pendientes y pospuestos por lo más cercano, enviados al revés. */
export function groupReminders(views: ReminderView[]): ReminderGroups {
  const groups: ReminderGroups = { pending: [], sent: [], snoozed: [] };
  for (const view of views) {
    if (view.reminder.status === 'enviado') groups.sent.push(view);
    else if (view.reminder.status === 'pospuesto') groups.snoozed.push(view);
    else groups.pending.push(view);
  }

  groups.pending.sort((a, b) => timeValue(a.reminder.dueAt) - timeValue(b.reminder.dueAt));
  groups.sent.sort((a, b) => timeValue(b.reminder.dueAt) - timeValue(a.reminder.dueAt));
  groups.snoozed.sort(
    (a, b) =>
      timeValue(a.reminder.snoozedUntil ?? a.reminder.dueAt) -
      timeValue(b.reminder.snoozedUntil ?? b.reminder.dueAt),
  );
  return groups;
}

/**
 * Fecha objetivo al posponer: `days` días desde el aviso o desde `now`, lo que
 * sea más tardío (posponer un aviso vencido no lo deja en el pasado).
 */
export function snoozeTarget(reminder: Reminder, days: number, now: Date): string {
  const base = timeValue(reminder.dueAt);
  const from = Number.isFinite(base) ? Math.max(base, now.getTime()) : now.getTime();
  const shift = Number.isFinite(days) ? Math.max(0, Math.trunc(days)) : 0;
  return new Date(from + shift * 86_400_000).toISOString();
}

/** Etiqueta de la ventana configurada, para la tarjeta de configuración. */
export function reminderWindowDays(): number {
  return REMINDER_WINDOW_DAYS;
}

export interface ProductStamp {
  /** `YYYY-MM-DD` en la zona del producto. */
  date: string;
  /** `HH:mm` en la zona del producto. */
  time: string;
}

/**
 * Día y hora del aviso en `America/Bogota`. Los ISO con hora se formatean con
 * `localDate`/`localTime` en vez de confiar en la zona del navegador: la hora
 * del recordatorio es un dato del plan y no debe moverse con el equipo.
 */
export function productStamp(iso: string | null): ProductStamp | null {
  if (iso === null) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return { date: localDate(parsed), time: localTime(parsed) };
}
