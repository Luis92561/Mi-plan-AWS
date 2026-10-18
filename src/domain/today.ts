import type { AppState, ChecklistItem, Topic } from '@/data/types';
import { daysBetween, localDate } from '@/lib/dates';
import { buildAlerts, type AppAlert } from './alerts';
import { pendingForToday } from './checklist';

export interface TodayQueue {
  topics: Topic[];
  checklist: ChecklistItem[];
  alerts: AppAlert[];
  /** Número que se muestra en el badge de la navegación. */
  badge: number;
  /** Certificaciones activas (planificadas y no aprobadas). */
  activeCertIds: string[];
}

const ACTIVE_STATUSES = new Set(['pendiente', 'estudiando', 'repasando']);

/**
 * §7.9 — Bandeja "Hoy": tres bloques en este orden.
 *  1. Temas que vencen (`nextReviewAt <= ahora`), por prioridad y examen próximo.
 *  2. Checklist con `dueDate <= hoy` o sin fecha de las certificaciones activas.
 *  3. Avisos (examen ≤30 días, voucher por vencer, inactividad).
 */
export function buildTodayQueue(state: AppState, now: Date): TodayQueue {
  const today = localDate(now);
  const nowIso = now.toISOString();

  const activeCertIds = state.planItems
    .filter((item) => item.status !== 'aprobado' && item.status !== 'saltado')
    .map((item) => item.certId);

  const examDays = new Map<string, number | null>();
  for (const certId of activeCertIds) {
    const item = state.planItems.find((p) => p.certId === certId);
    examDays.set(certId, item?.targetDate ? daysBetween(today, item.targetDate) : null);
  }

  const topics = state.topics
    .filter(
      (topic) =>
        ACTIVE_STATUSES.has(topic.status) &&
        topic.nextReviewAt !== null &&
        topic.nextReviewAt <= nowIso &&
        (activeCertIds.length === 0 || activeCertIds.includes(topic.certId)),
    )
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const daysA = examDays.get(a.certId) ?? Number.MAX_SAFE_INTEGER;
      const daysB = examDays.get(b.certId) ?? Number.MAX_SAFE_INTEGER;
      if (daysA !== daysB) return daysA - daysB;
      return (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? '');
    });

  const checklist = pendingForToday(state.checklistItems, today, activeCertIds);

  return {
    topics,
    checklist,
    alerts: buildAlerts(state, now),
    badge: topics.length + checklist.length,
    activeCertIds,
  };
}

/** Emoji/estado del tema para las filas (§7.9). */
export function topicUrgency(topic: Topic, now: Date): 'overdue' | 'today' | 'upcoming' {
  if (!topic.nextReviewAt) return 'upcoming';
  const due = topic.nextReviewAt.slice(0, 10);
  const today = localDate(now);
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  return 'upcoming';
}
