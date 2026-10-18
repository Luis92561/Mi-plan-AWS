import type { Certification, Confidence, Domain, Priority, Topic, TopicStatus } from '@/data/types';
import { addDaysToDate, dateTimeInTz, daysBetween, localDate, localTime } from '@/lib/dates';

/**
 * Programación de temas (repetición espaciada de unidades de estudio) §8.7.
 * Es lógica pura: no toca Dexie, ni React, ni el DOM, y nunca lee el reloj
 * (siempre recibe `now`). La hora local de Bogotá se delega a `@/lib/dates`.
 */

/** Intervalos en días para confianza ≥ 4, indexados por el número de repasos previos. */
const INTERVALS_DAYS = [1, 3, 7, 16, 35, 75] as const;

/** Hora por defecto del recordatorio diario (misma que `Settings.dailyReminderTime`). */
export const DEFAULT_REMINDER_TIME = '19:00';

/** Cuando el tema pasa a `dominado` se revisa una vez al mes. */
const MASTERED_INTERVAL_DAYS = 30;

/** Repasos necesarios (contando el actual) para poder dominar un tema. */
const MASTERED_REVIEWS = 3;

/** Si el examen está a ≤ 14 días, todos sus temas suben a prioridad 1. */
const EXAM_URGENT_DAYS = 14;

/** Resultado de volver a programar un tema. `topic` es una copia, nunca el original. */
export interface ScheduleResult {
  topic: Topic;
  intervalDays: number;
  nextReviewAt: string;
  status: TopicStatus;
  reviewCount: number;
}

/** Normaliza "HH:mm" y cae al valor por defecto si el ajuste está mal formado. */
function normalizeReminderTime(time: string | undefined): string {
  if (typeof time !== 'string') return DEFAULT_REMINDER_TIME;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : DEFAULT_REMINDER_TIME;
}

/** Hora local (America/Bogota) de un ISO, o la hora por defecto si no es parseable. */
function reminderTimeOf(iso: string | null): string {
  if (iso === null) return DEFAULT_REMINDER_TIME;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return DEFAULT_REMINDER_TIME;
  return normalizeReminderTime(localTime(new Date(parsed)));
}

/**
 * §8.7 — al marcar un tema como estudiado con confianza `confidence`:
 *   c ≥ 4 → intervalDays = [1, 3, 7, 16, 35, 75][min(reviewCount, 5)]
 *   c = 3 → intervalDays = max(1, round(intervalDays * 0.8))
 *   c ≤ 2 → intervalDays = 1 y status = 'repasando'
 *   nextReviewAt = hoy + intervalDays a la hora `dailyReminderTime` (Bogotá)
 *   reviewCount += 1
 *   reviewCount ≥ 3 y c ≥ 4 → status = 'dominado' y nextReviewAt = hoy + 30
 *
 * Detalle literal de la spec: al dominar, el repaso se agenda a 30 días pero
 * `intervalDays` conserva el intervalo calculado para ese repaso (7 en el
 * tercer repaso con confianza alta), que es lo que se persiste en el tema.
 */
export function scheduleTopic(
  topic: Topic,
  confidence: Confidence,
  now: Date,
  opts: { dailyReminderTime?: string } = {},
): ScheduleResult {
  const reminderTime = normalizeReminderTime(opts.dailyReminderTime);
  const today = localDate(now);
  const previousReviews = topic.reviewCount;
  const reviewCount = previousReviews + 1;

  let intervalDays: number;
  if (confidence >= 4) {
    intervalDays = INTERVALS_DAYS[Math.min(previousReviews, INTERVALS_DAYS.length - 1)];
  } else if (confidence === 3) {
    intervalDays = Math.max(1, Math.round(topic.intervalDays * 0.8));
  } else {
    intervalDays = 1;
  }

  const mastered = reviewCount >= MASTERED_REVIEWS && confidence >= 4;
  const status: TopicStatus = mastered ? 'dominado' : confidence <= 2 ? 'repasando' : 'estudiando';
  const scheduledDays = mastered ? MASTERED_INTERVAL_DAYS : intervalDays;
  const nextReviewAt = dateTimeInTz(addDaysToDate(today, scheduledDays), reminderTime);
  const studiedAt = now.toISOString();

  const updated: Topic = {
    ...topic,
    confidence,
    intervalDays,
    nextReviewAt,
    status,
    reviewCount,
    lastStudiedAt: studiedAt,
    updatedAt: studiedAt,
  };

  return { topic: updated, intervalDays, nextReviewAt, status, reviewCount };
}

/**
 * §8.7 — posponer a mano. Solo mueve `nextReviewAt` (hoy + `days`, a la misma
 * hora local que tenía el tema): **no** toca `ease`, `intervalDays`, `status`
 * ni `reviewCount`, y no reescribe `updatedAt`.
 */
export function snoozeTopic(topic: Topic, days: number, now: Date): Topic {
  const today = localDate(now);
  const shift = Number.isFinite(days) ? Math.max(0, Math.trunc(days)) : 0;
  const time = reminderTimeOf(topic.nextReviewAt);
  const nextReviewAt = dateTimeInTz(addDaysToDate(today, shift), time);
  return { ...topic, nextReviewAt };
}

/**
 * §8.7 — prioridad automática. Con el examen a ≤ 14 días todos los temas
 * suben a prioridad 1; los temas de dominios débiles también. Solo se sube la
 * prioridad (1 es la más alta), nunca se baja, y no se muta la entrada.
 */
export function reprioritizeTopics(
  topics: Topic[],
  opts: { examDate: string | null; today: string; weakDomainIds: string[] },
): Topic[] {
  const untilExam = opts.examDate === null ? null : daysBetween(opts.today, opts.examDate);
  const examIsUrgent =
    untilExam !== null && Number.isFinite(untilExam) && untilExam >= 0 && untilExam <= EXAM_URGENT_DAYS;
  const weakDomains = new Set(opts.weakDomainIds);

  return topics.map((topic) => {
    const isWeak = topic.domainId !== null && weakDomains.has(topic.domainId);
    const priority: Priority = examIsUrgent || isWeak ? 1 : topic.priority;
    return { ...topic, priority };
  });
}

/**
 * §8.7 — un tema sin dominio se asigna al dominio de mayor peso de su
 * certificación (el primero gana en caso de empate). Pura: devuelve una copia.
 */
export function assignMissingDomain(topic: Topic, cert: Certification): Topic {
  if (topic.domainId !== null) return topic;
  const domains = cert.domains ?? [];
  let best: Domain | null = null;
  for (const domain of domains) {
    if (best === null || domain.weight > best.weight) best = domain;
  }
  if (best === null) return topic;
  return { ...topic, domainId: best.id };
}
