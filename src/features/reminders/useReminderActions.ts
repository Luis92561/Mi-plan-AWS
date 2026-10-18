import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import type { AppState, Confidence, Reminder } from '@/data/types';
import { scheduleTopic } from '@/domain/schedule';
import { saveStudySession } from '@/features/studylog/QuickSession';
import { useT } from '@/lib/i18n/useT';
import { snoozeTarget, type ReminderView } from './model';

/**
 * §8.8: «Hecho» en un aviso de tema registra una sesión de repaso de 30 min y
 * reprograma el tema con la regla de §8.7. La sesión queda en la bitácora, que
 * es donde se puede editar.
 */
const DONE_SESSION_MINUTES = 30;
const DONE_CONFIDENCE: Confidence = 3;

export interface ReminderActions {
  /** Último resultado, para la región `aria-live` de la página. */
  status: string;
  /** Recordatorio con una escritura en curso (deshabilita sus botones). */
  busyId: string | null;
  markDone: (view: ReminderView) => Promise<void>;
  snooze: (view: ReminderView, days: number) => Promise<void>;
  discard: (view: ReminderView) => Promise<void>;
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Escrituras de la bandeja de Recordatorios. Solo tocan IndexedDB: ninguna
 * navega, ninguna usa la red y la vista se actualiza por `useAppState()`
 * (LiveQuery), así que el estado guardado se refleja al instante.
 */
export function useReminderActions(state: AppState): ReminderActions {
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
      const message = t('reminders.action.error', { message: messageOf(cause) });
      setStatus(message);
      notify(message, 'err');
    },
    [notify, t],
  );

  const markDone = useCallback(
    async (view: ReminderView) => {
      const { reminder } = view;
      setBusyId(reminder.id);
      try {
        const db = getDb();
        const now = new Date();
        const topic =
          reminder.type === 'tema' && reminder.refId !== null
            ? state.topics.find((item) => item.id === reminder.refId)
            : undefined;
        const canReschedule =
          topic !== undefined && topic.status !== 'archivado' && topic.status !== 'dominado';
        const scheduled = canReschedule
          ? scheduleTopic(topic, DONE_CONFIDENCE, now, { dailyReminderTime: state.settings.dailyReminderTime })
          : null;

        await db.transaction('rw', [db.reminders, db.topics, db.studySessions], async () => {
          await db.reminders.put({ ...reminder, status: 'hecho', snoozedUntil: null });
          if (topic && scheduled) {
            await saveStudySession({
              certId: topic.certId,
              domainId: topic.domainId,
              minutes: DONE_SESSION_MINUTES,
              type: 'repaso',
              confidence: DONE_CONFIDENCE,
              notes: '',
              topicId: topic.id,
            });
            await db.topics.put(scheduled.topic);
          }
        });

        succeed(t('reminders.done.done', { title: reminder.title }));
      } catch (cause) {
        fail(cause);
      } finally {
        setBusyId(null);
      }
    },
    [fail, state.settings.dailyReminderTime, state.topics, succeed, t],
  );

  const snooze = useCallback(
    async (view: ReminderView, days: number) => {
      const target = snoozeTarget(view.reminder, days, new Date());
      setBusyId(view.reminder.id);
      try {
        await getDb().reminders.put({ ...view.reminder, status: 'pospuesto', snoozedUntil: target });
        succeed(t('reminders.snooze.done', { date: f.date(target) }));
      } catch (cause) {
        fail(cause);
      } finally {
        setBusyId(null);
      }
    },
    [fail, f, succeed, t],
  );

  const discard = useCallback(
    async (view: ReminderView) => {
      setBusyId(view.reminder.id);
      try {
        const closed: Reminder = { ...view.reminder, status: 'descartado', snoozedUntil: null };
        await getDb().reminders.put(closed);
        succeed(t('reminders.discard.done', { title: view.reminder.title }));
      } catch (cause) {
        fail(cause);
      } finally {
        setBusyId(null);
      }
    },
    [fail, succeed, t],
  );

  return { status, busyId, markDone, snooze, discard };
}
