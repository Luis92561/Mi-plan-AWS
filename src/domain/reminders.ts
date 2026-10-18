import type {
  Attempt,
  Certification,
  ChecklistItem,
  PlanItem,
  Reminder,
  ReminderChannel,
  ReminderType,
  Settings,
  StudySession,
  Topic,
  Voucher,
} from '@/data/types';
import { addDaysToDate, dateTimeInTz, daysBetween, localDate, localTime, weekdayOf } from '@/lib/dates';

/**
 * Recordatorios §8.8. Función pura y determinista: nunca llama a `Date.now()`;
 * todo se calcula a partir del `now` recibido. La ventana es de 14 días y el
 * resultado se ordena por día y, dentro del día, por prioridad.
 */

/** Días que cubre una generación de recordatorios (hoy incluido). */
export const REMINDER_WINDOW_DAYS = 14;

/** Un examen genera aviso diario durante sus últimos 7 días. */
const EXAM_ALERT_DAYS = 7;

/** Un voucher avisa durante sus últimos 3 días (y el propio día de vencimiento). */
const VOUCHER_ALERT_DAYS = 3;

/** Días sin sesiones que disparan el aviso de inactividad. */
const INACTIVITY_DAYS = 3;

const DEFAULT_DAILY_TIME = '19:00';

/** Orden de prioridad de §8.8 (menor = más importante). */
const PRIORITY: Record<ReminderType, number> = {
  examen: 0,
  tema: 1,
  checklist: 2,
  voucher: 3,
  inactividad: 4,
  custom: 5,
};

export interface ReminderInput {
  now: Date;
  settings: Settings;
  topics: Topic[];
  certifications: Certification[];
  planItems: PlanItem[];
  checklistItems: ChecklistItem[];
  vouchers: Voucher[];
  attempts: Attempt[];
  studySessions: StudySession[];
}

/** Convierte "HH:mm" a minutos desde medianoche; null si no es válido. */
function toMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function isValidDate(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeDailyTime(time: string): string {
  return toMinutes(time) === null ? DEFAULT_DAILY_TIME : time;
}

/**
 * ¿El instante cae dentro de `settings.quietHours` (hora de Bogotá)?
 * Soporta rangos que cruzan medianoche ("22:00"–"07:00"). Un rango vacío o
 * mal formado nunca silencia.
 */
export function isWithinQuietHours(settings: Settings, date: Date): boolean {
  const from = toMinutes(settings.quietHours.from);
  const to = toMinutes(settings.quietHours.to);
  if (from === null || to === null || from === to) return false;
  const current = toMinutes(localTime(date));
  if (current === null) return false;
  return from < to ? current >= from && current < to : current >= from || current < to;
}

function compareReminders(a: Reminder, b: Reminder): number {
  const byPriority = (PRIORITY[a.type] ?? 99) - (PRIORITY[b.type] ?? 99);
  if (byPriority !== 0) return byPriority;
  if (a.dueAt !== b.dueAt) return a.dueAt < b.dueAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Recorta los recordatorios de un día a `max` entradas, conservando los de
 * mayor prioridad. Devuelve solo los recordatorios de `day` (fecha local).
 * Si `max` no es positivo no hay entrega ese día.
 */
export function capPerDay(reminders: Reminder[], max: number, day: string): Reminder[] {
  if (!Number.isFinite(max) || max <= 0) return [];
  return [...reminders]
    .filter((reminder) => localDate(new Date(reminder.dueAt)) === day)
    .sort(compareReminders)
    .slice(0, Math.floor(max));
}

function lastStudyDay(sessions: StudySession[], fallback: string): string {
  let last: string | null = null;
  for (const session of sessions) {
    if (!isValidDate(session.date)) continue;
    if (last === null || session.date > last) last = session.date;
  }
  return last ?? fallback;
}

/**
 * §8.8 — recordatorios de los próximos 14 días.
 *
 * Prioridad: examen a ≤7 días > tema vencido > checklist vencido > voucher por
 * vencer > inactividad (≥3 días sin sesiones). Respeta `maxRemindersPerDay`,
 * `quietHours` y `studyDays`; deduplica por `(type, refId, día)`.
 */
export function buildReminders(input: ReminderInput): Reminder[] {
  const { now, settings, topics, certifications, planItems, checklistItems, vouchers, attempts, studySessions } =
    input;

  const today = localDate(now);
  const todayIso = now.toISOString();
  const dailyTime = normalizeDailyTime(settings.dailyReminderTime);
  const channel: ReminderChannel = settings.remindersEnabled ? 'browser' : 'inapp';
  const maxPerDay = Math.floor(settings.maxRemindersPerDay);
  if (maxPerDay <= 0) return [];

  const studyDays =
    Array.isArray(settings.studyDays) && settings.studyDays.length > 0
      ? new Set(settings.studyDays)
      : null;

  const certsById = new Map(certifications.map((cert) => [cert.id, cert]));
  const passedCerts = new Set(
    attempts.filter((attempt) => attempt.kind === 'real' && attempt.passed === true).map((a) => a.certId),
  );

  const baseline = isValidDate(settings.startDate) ? settings.startDate : today;
  const lastSessionDay = lastStudyDay(studySessions, baseline);
  const inactivityFrom = addDaysToDate(lastSessionDay, INACTIVITY_DAYS);
  const inactivityDay = daysBetween(inactivityFrom, today) > 0 ? today : inactivityFrom;

  const byDay = new Map<string, Reminder[]>();
  const seen = new Set<string>();

  const push = (type: ReminderType, refId: string | null, day: string, title: string): void => {
    const key = `${type}|${refId ?? ''}|${day}`;
    if (seen.has(key)) return;
    seen.add(key);
    const reminder: Reminder = {
      id: `rem-${type}-${refId ?? 'sin-ref'}-${day}`,
      type,
      refId,
      title,
      dueAt: dateTimeInTz(day, dailyTime),
      channel,
      status: 'pendiente',
      snoozedUntil: null,
      createdAt: todayIso,
    };
    const forDay = byDay.get(day);
    if (forDay) forDay.push(reminder);
    else byDay.set(day, [reminder]);
  };

  for (let offset = 0; offset < REMINDER_WINDOW_DAYS; offset += 1) {
    const day = addDaysToDate(today, offset);
    // studyDays: no se genera nada en días no lectivos.
    if (studyDays !== null && !studyDays.has(weekdayOf(day))) continue;
    // quietHours: si la hora de aviso cae en silencio, ese día no se entrega.
    if (isWithinQuietHours(settings, new Date(dateTimeInTz(day, dailyTime)))) continue;

    // 1) Examen a ≤ 7 días.
    for (const planItem of planItems) {
      if (!isValidDate(planItem.targetDate)) continue;
      if (planItem.status === 'aprobado' || planItem.status === 'saltado') continue;
      if (passedCerts.has(planItem.certId)) continue;
      const remaining = daysBetween(day, planItem.targetDate);
      if (remaining < 0 || remaining > EXAM_ALERT_DAYS) continue;
      const code = certsById.get(planItem.certId)?.code ?? planItem.certId;
      const title =
        remaining === 0
          ? `Examen ${code} hoy`
          : `Examen ${code} en ${remaining} ${remaining === 1 ? 'día' : 'días'}`;
      push('examen', planItem.certId, day, title);
    }

    // 2) Tema vencido (o que vence este día dentro de la ventana).
    for (const topic of topics) {
      if (topic.status === 'dominado' || topic.status === 'archivado') continue;
      if (topic.nextReviewAt === null) continue;
      if (Number.isNaN(Date.parse(topic.nextReviewAt))) continue;
      const dueDay = localDate(new Date(topic.nextReviewAt));
      const overdue = daysBetween(dueDay, today) > 0;
      if (overdue) {
        if (day !== today) continue;
      } else if (dueDay !== day) {
        continue;
      }
      push('tema', topic.id, day, `Repasar: ${topic.title}`);
    }

    // 3) Checklist vencido (o que vence este día); nunca para ítems hechos.
    for (const item of checklistItems) {
      if (item.done || !isValidDate(item.dueDate)) continue;
      const overdue = daysBetween(item.dueDate, today) > 0;
      if (overdue) {
        if (day !== today) continue;
      } else if (item.dueDate !== day) {
        continue;
      }
      push('checklist', item.id, day, `Checklist: ${item.title}`);
    }

    // 4) Voucher por vencer (últimos 3 días y el propio día de vencimiento).
    for (const voucher of vouchers) {
      if (voucher.status !== 'disponible' || !isValidDate(voucher.expiresAt)) continue;
      const remaining = daysBetween(day, voucher.expiresAt);
      if (remaining < 0 || remaining > VOUCHER_ALERT_DAYS) continue;
      const title =
        remaining === 0 ? `Vence hoy el voucher ${voucher.label}` : `Voucher ${voucher.label} por vencer`;
      push('voucher', voucher.id, day, title);
    }

    // 5) Inactividad: un solo aviso, el primer día con ≥3 días sin sesiones.
    if (day === inactivityDay) {
      const daysIdle = daysBetween(lastSessionDay, day);
      push('inactividad', null, day, `Llevas ${daysIdle} días sin registrar sesiones`);
    }
  }

  const result: Reminder[] = [];
  for (const day of [...byDay.keys()].sort()) {
    result.push(...capPerDay(byDay.get(day) ?? [], maxPerDay, day));
  }
  return result;
}
