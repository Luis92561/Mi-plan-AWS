import { useCallback, useState } from 'react';
import { getDb } from '@/data/db';
import type { AppState, ChecklistItem, Confidence, Reminder, Topic } from '@/data/types';
import { completeItem, type CompleteResult } from '@/domain/checklist';
import { scheduleTopic, snoozeTopic } from '@/domain/schedule';
import { saveStudySession } from '@/features/studylog/QuickSession';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/lib/i18n/useT';
import { localDate } from '@/lib/dates';

/** Lo que devuelve el mini-registro en línea (§7.9). */
export interface StudyDraft {
  minutes: number;
  confidence: Confidence;
  note: string;
}

export interface TodayActions {
  /** Crea la sesión, reprograma el tema (§8.7), cierra checklist y recordatorio. */
  study: (topic: Topic, draft: StudyDraft) => Promise<boolean>;
  /** §8.7: solo mueve `nextReviewAt`. */
  snooze: (topic: Topic, days: number) => Promise<void>;
  /** Marca `status: 'archivado'`. */
  archive: (topic: Topic) => Promise<void>;
  /** §8.9: completa el ítem y crea la siguiente instancia si es recurrente. */
  completeChecklist: (item: ChecklistItem) => Promise<void>;
  /** Último resultado de escritura; lo anuncia la región `aria-live` de la página. */
  status: string;
  /** Fila con una escritura en curso (para deshabilitar y anunciar `aria-busy`). */
  busyId: string | null;
}

/** Fecha `YYYY-MM-DD` (Bogotá) de un ISO, o la de hoy si no es parseable. */
function dateOf(iso: string | null, fallback: Date): string {
  if (iso === null) return localDate(fallback);
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? localDate(fallback) : localDate(parsed);
}

/**
 * Escrituras de la bandeja "Hoy". Ninguna navega ni usa la red: la vista se
 * entera de los cambios por `useAppState()` (LiveQuery sobre IndexedDB).
 */
export function useTodayActions(state: AppState): TodayActions {
  const { t, f } = useT();
  const { notify } = useToast();
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const succeed = useCallback(
    (message: string) => {
      setStatus(message);
      notify(message, 'ok');
    },
    [notify],
  );

  const fail = useCallback(
    (cause: unknown) => {
      const reason = cause instanceof Error ? cause.message : String(cause);
      const message = t('today.error', { message: reason });
      setStatus(message);
      notify(message, 'err');
    },
    [notify, t],
  );

  const study = useCallback(
    async (topic: Topic, draft: StudyDraft): Promise<boolean> => {
      setBusyId(topic.id);
      try {
        const db = getDb();
        const now = new Date();

        // §8.7 — la reprogramación se calcula antes de escribir.
        const scheduled = scheduleTopic(topic, draft.confidence, now, {
          dailyReminderTime: state.settings.dailyReminderTime,
        });

        // Si el tema venía de un ítem del checklist, se completa también.
        const linked = state.checklistItems.find(
          (item) => item.topicId === topic.id && !item.done && !item.archived,
        );
        const checklistWrite: CompleteResult | null = linked
          ? completeItem(linked, state.checklistItems, now)
          : null;

        // Los avisos pendientes de este tema se cierran: la próxima revisión ya
        // quedó agendada, así que `buildReminders` la volverá a proponer en su fecha.
        const closedReminders: Reminder[] = state.reminders
          .filter(
            (reminder) =>
              reminder.type === 'tema' && reminder.refId === topic.id && reminder.status === 'pendiente',
          )
          .map((reminder) => ({ ...reminder, status: 'hecho' }));

        // Una sola transacción: sesión + tema + checklist + recordatorios.
        await db.transaction(
          'rw',
          [db.studySessions, db.topics, db.checklistItems, db.reminders],
          async () => {
            await saveStudySession({
              certId: topic.certId,
              domainId: topic.domainId,
              minutes: draft.minutes,
              type: 'repaso',
              confidence: draft.confidence,
              notes: draft.note,
              topicId: topic.id,
            });
            await db.topics.put(scheduled.topic);
            if (checklistWrite) {
              await db.checklistItems.put(checklistWrite.updated);
              if (checklistWrite.spawned) await db.checklistItems.put(checklistWrite.spawned);
            }
            if (closedReminders.length > 0) await db.reminders.bulkPut(closedReminders);
          },
        );

        succeed(
          t('today.study.saved', {
            minutes: f.minutes(draft.minutes),
            date: f.date(dateOf(scheduled.nextReviewAt, now)),
          }),
        );
        return true;
      } catch (cause) {
        fail(cause);
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [f, fail, state.checklistItems, state.reminders, state.settings.dailyReminderTime, succeed, t],
  );

  const snooze = useCallback(
    async (topic: Topic, days: number): Promise<void> => {
      setBusyId(topic.id);
      try {
        const now = new Date();
        const next = snoozeTopic(topic, days, now);
        await getDb().topics.put(next);
        succeed(t('today.snooze.done', { count: days, date: f.date(dateOf(next.nextReviewAt, now)) }));
      } catch (cause) {
        fail(cause);
      } finally {
        setBusyId(null);
      }
    },
    [fail, f, succeed, t],
  );

  const archive = useCallback(
    async (topic: Topic): Promise<void> => {
      setBusyId(topic.id);
      try {
        const now = new Date();
        await getDb().topics.put({ ...topic, status: 'archivado', updatedAt: now.toISOString() });
        succeed(t('today.archive.done', { title: topic.title }));
      } catch (cause) {
        fail(cause);
      } finally {
        setBusyId(null);
      }
    },
    [fail, succeed, t],
  );

  const completeChecklist = useCallback(
    async (item: ChecklistItem): Promise<void> => {
      setBusyId(item.id);
      try {
        const db = getDb();
        const now = new Date();
        const result = completeItem(item, state.checklistItems, now);
        await db.transaction('rw', db.checklistItems, async () => {
          await db.checklistItems.put(result.updated);
          if (result.spawned) await db.checklistItems.put(result.spawned);
        });
        succeed(
          result.spawned && result.spawned.dueDate
            ? t('today.checklist.completedRecurring', { title: item.title, date: f.date(result.spawned.dueDate) })
            : t('today.checklist.completed', { title: item.title }),
        );
      } catch (cause) {
        fail(cause);
      } finally {
        setBusyId(null);
      }
    },
    [f, fail, state.checklistItems, succeed, t],
  );

  return { study, snooze, archive, completeChecklist, status, busyId };
}
